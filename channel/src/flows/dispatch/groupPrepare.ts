import type { InboundMessage } from "../../core/routing/resolveRoute.js";
import { buildSessionKey } from "../../core/routing/sessionKey.js";
import type { RoutingMode } from "../../types.js";

export interface GroupAgentDispatchTarget {
    agentId: string;
    sessionKey: string;
}

export interface PrepareGroupDispatchParams {
    inbound: InboundMessage;
    agentIds: string[];
    routeKind: RoutingMode;
}

// 为群聊里的每个 Agent 准备独立 sessionKey，避免多个 Agent 串上下文。
export function prepareGroupDispatchTargets(params: PrepareGroupDispatchParams): GroupAgentDispatchTarget[] {
    const { inbound, agentIds, routeKind } = params;
    return agentIds.map((agentId) => ({
        agentId,
        sessionKey: buildSessionKey({
            agentId,
            chatType: inbound.chat.type,
            chatId: inbound.chat.chatId,
            routeKind,
            threadId: inbound.chat.threadId,
        }),
    }));
}
