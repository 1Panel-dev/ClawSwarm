import { buildSessionKey } from "../core/routing/sessionKey.js";
import type { InboundMessage } from "../core/routing/resolveRoute.js";
import type { MessageStateStore } from "../core/message/messageState.js";

export interface InboundMessageStateParams {
    messageState: MessageStateStore;
    inbound: InboundMessage;
    traceId: string;
    accountId: string;
    decision: {
        kind: "DIRECT" | "GROUP_MENTION" | "GROUP_BROADCAST";
        conversationId: string;
        groupId?: string;
        targetAgentIds: string[];
    };
}

export function createInboundMessageState(params: InboundMessageStateParams) {
    const { messageState, inbound, traceId, accountId, decision } = params;
    const now = new Date().toISOString();
    messageState.create({
        messageId: inbound.messageId,
        traceId,
        accountId,
        conversationId: decision.conversationId,
        groupId: decision.groupId,
        targetAgentIds: [],
        sessionKeys: [],
        status: "RECEIVED",
        createdAt: now,
        lastUpdated: now,
    });
    messageState.update(inbound.messageId, { status: "VALIDATED" });
    messageState.update(inbound.messageId, {
        status: "ROUTED",
        routingMode: decision.kind,
        targetAgentIds: decision.targetAgentIds,
        sessionKeys: decision.targetAgentIds.map((agentId) =>
            buildSessionKey({
                agentId,
                chatType: inbound.chat.type,
                chatId: inbound.chat.chatId,
                routeKind: decision.kind,
                threadId: inbound.chat.threadId,
                useDedicatedDirectSession: inbound.useDedicatedDirectSession,
            }),
        ),
    });
}
