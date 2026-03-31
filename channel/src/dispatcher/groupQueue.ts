import type { AccountConfig } from "../config.js";

// 一个最小可用的信号量实现，用于限制全局或单 Agent 并发。
class Semaphore {
    private available: number;
    private waiters: Array<() => void> = [];

    constructor(n: number) {
        this.available = n;
    }

    async acquire(): Promise<() => void> {
        // 还有配额时立即拿到；没有配额时进入等待队列。
        if (this.available > 0) {
            this.available -= 1;
            return () => this.release();
        }

        await new Promise<void>((resolve) => this.waiters.push(resolve));
        this.available -= 1;
        return () => this.release();
    }

    private release() {
        this.available += 1;
        const waiter = this.waiters.shift();
        if (waiter) waiter();
    }
}

// keyedTail 用来保证“同一个 Agent + 同一个会话”的任务顺序执行。
const keyedTail = new Map<string, Promise<void>>();

function enqueueKeyed(key: string, task: () => Promise<void>): Promise<void> {
    // 新任务会串到上一个同 key 任务后面，避免同一上下文并发写乱序。
    const previous = keyedTail.get(key) ?? Promise.resolve();
    const next = previous
        .catch(() => undefined)
        .then(task)
        .finally(() => {
            if (keyedTail.get(key) === next) keyedTail.delete(key);
        });

    keyedTail.set(key, next);
    return next;
}

export function createGroupDispatchQueue(accountConfig: AccountConfig) {
    // globalSem 控制整个账号维度的总并发。
    const globalSem = new Semaphore(accountConfig.limits.maxInFlightRuns);
    // perAgentSem 控制单个 Agent 的并发，避免某个 Agent 被群聊打爆。
    const perAgentSem = new Map<string, Semaphore>();

    const getAgentSem = (agentId: string) => {
        const current = perAgentSem.get(agentId);
        if (current) return current;

        const created = new Semaphore(accountConfig.limits.perAgentConcurrency);
        perAgentSem.set(agentId, created);
        return created;
    };

    return {
        async run(params: {
            accountId: string;
            agentId: string;
            sessionKey: string;
            task: () => Promise<void>;
        }): Promise<void> {
            const queueKey = `${params.accountId}|${params.agentId}|${params.sessionKey}`;
            return enqueueKeyed(queueKey, async () => {
                // 先占全局配额，再占单 Agent 配额；释放顺序反过来也没问题。
                const releaseGlobal = await globalSem.acquire();
                const releaseAgent = await getAgentSem(params.agentId).acquire();

                try {
                    await params.task();
                } finally {
                    releaseAgent();
                    releaseGlobal();
                }
            });
        },
    };
}
