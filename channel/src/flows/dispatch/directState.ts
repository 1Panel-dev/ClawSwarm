import type { InboundMessage } from "../../core/routing/resolveRoute.js";
import type { MessageStateStore } from "../../core/message/messageState.js";
import type { RoutingMode } from "../../types.js";

interface DirectMessageStateParams {
    messageState: MessageStateStore;
    inbound: InboundMessage;
    agentId: string;
    routeKind: RoutingMode;
    sessionKey: string;
}

// direct 调度开始执行时，记录当前 Agent 和会话信息。
export function markDirectDispatched(params: DirectMessageStateParams): void {
    const { messageState, inbound, agentId, routeKind, sessionKey } = params;
    if (!messageState.get(inbound.messageId)) return;

    messageState.update(inbound.messageId, {
        status: "DISPATCHED",
        routingMode: routeKind,
        targetAgentIds: [agentId],
        sessionKeys: [sessionKey],
    });
}

// direct 调度成功回调完成后，标记整条消息已经完成回推。
export function markDirectCallbackSent(params: DirectMessageStateParams): void {
    const { messageState, inbound, agentId, routeKind, sessionKey } = params;
    if (!messageState.get(inbound.messageId)) return;

    messageState.update(inbound.messageId, {
        status: "CALLBACK_SENT",
        routingMode: routeKind,
        targetAgentIds: [agentId],
        sessionKeys: [sessionKey],
    });
}

// direct 调度失败时，保留错误信息，方便后续排障。
export function markDirectFailed(params: DirectMessageStateParams & { error: string }): void {
    const { messageState, inbound, agentId, routeKind, sessionKey, error } = params;
    if (!messageState.get(inbound.messageId)) return;

    messageState.update(inbound.messageId, {
        status: "FAILED",
        routingMode: routeKind,
        targetAgentIds: [agentId],
        sessionKeys: [sessionKey],
        error,
    });
}
