/**
 * 这个文件负责群聊场景下的多 Agent 调度。
 * 它本身不直接执行业务逻辑，而是把每个 Agent 的任务安全地排队后交给 dispatchDirect。
 */
import type { Logger } from "../../logging/logger.js";
import type { AccountConfig } from "../../config.js";
import type { IdempotencyStore } from "../../storage/idempotency.js";
import type { MessageStateStore } from "../../core/message/messageState.js";
import type { ClawSwarmCallbackClient } from "../callback/client.js";
import type { OpenClawRuntimeAdapter } from "../../openclaw/runtime/adapters.js";
import type { InboundMessage } from "../../core/routing/resolveRoute.js";
import { dispatchDirect } from "./dispatchDirect.js";
import { prepareGroupDispatchTargets } from "./groupPrepare.js";
import { createGroupDispatchQueue } from "./groupQueue.js";
import { markGroupCompleted, markGroupDispatched } from "./groupState.js";

export interface GroupDispatchParams {
    channelId: string;
    accountId: string;
    accountConfig: AccountConfig;
    logger: Logger;
    idempotency: IdempotencyStore;
    messageState: MessageStateStore;
    clawSwarm: ClawSwarmCallbackClient;
    openclaw: OpenClawRuntimeAdapter;
    inbound: InboundMessage;
    agentIds: string[];
    routeKind: "GROUP_MENTION" | "GROUP_BROADCAST";
    traceId: string;
}

// dispatchGroup 只负责编排，不负责具体 Agent 执行细节。
export async function dispatchGroup(params: GroupDispatchParams): Promise<void> {
    const {
        channelId,
        accountId,
        accountConfig,
        logger,
        idempotency,
        messageState,
        clawSwarm,
        openclaw,
        inbound,
        agentIds,
        routeKind,
        traceId,
    } = params;

    const queue = createGroupDispatchQueue(accountConfig);
    const targets = prepareGroupDispatchTargets({ inbound, agentIds, routeKind });
    markGroupDispatched({ messageState, inbound, routeKind, targets });

    const tasks = targets.map(async ({ agentId, sessionKey }) => {
        return queue.run({
            accountId,
            agentId,
            sessionKey,
            task: async () => {
                return await dispatchDirect({
                    channelId,
                    accountId,
                    accountConfig,
                    logger,
                    idempotency,
                    messageState,
                    clawSwarm,
                    openclaw,
                    inbound,
                    agentId,
                    routeKind,
                    traceId,
                    updateMessageState: false,
                });
            },
        });
    });

    const results = await Promise.all(tasks);
    markGroupCompleted({
        messageState,
        inbound,
        routeKind,
        targets,
        hasFailed: results.some((result) => !result.ok),
    });
}
