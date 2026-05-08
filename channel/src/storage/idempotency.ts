/**
 * 这个文件负责幂等去重存储。
 * 任何“同一消息不要重复执行”的约束，都应该通过这里统一实现。
 */
import type { Logger } from "../logging/logger.js";

export interface IdempotencyStore {
    // 如果 key 首次写入成功则返回 true；如果已存在则返回 false。
    setIfNotExists(key: string, ttlSeconds: number): Promise<boolean>;
    close(): Promise<void>;
}

export interface CreateIdempotencyStoreParams {
    logger: Logger;
}

export interface MessageAgentDedupeKeyParams {
    accountId: string;
    messageId: string;
    agentId: string;
}

// 内存实现适合当前单插件进程内的消息去重。
class MemoryIdempotencyStore implements IdempotencyStore {
    private map = new Map<string, number>();

    constructor(private logger: Logger) {}

    // 这是一个简单的懒 GC：每次写入前顺手清掉过期数据。
    private gc(now: number): void {
        for (const [k, exp] of this.map) {
            if (exp <= now) this.map.delete(k);
        }
    }

    async setIfNotExists(key: string, ttlSeconds: number): Promise<boolean> {
        const now = Date.now();
        this.gc(now);
        const exp = this.map.get(key);
        if (exp && exp > now) return false;
        this.map.set(key, now + ttlSeconds * 1000);
        return true;
    }

    async close(): Promise<void> {
        this.map.clear();
        this.logger.info({}, "memory idempotency store closed");
    }
}

// 工厂函数统一创建幂等存储，后续如果增加新实现也只改这里。
export function createIdempotencyStore(params: CreateIdempotencyStoreParams): IdempotencyStore {
    params.logger.info({}, "using memory idempotency store");
    return new MemoryIdempotencyStore(params.logger);
}

// messageId + agentId 是当前插件里最重要的幂等粒度。
export function dedupeKeyForMessageAgent(params: MessageAgentDedupeKeyParams): string {
    return `oc:dedupe:${params.accountId}:${params.messageId}:${params.agentId}`;
}
