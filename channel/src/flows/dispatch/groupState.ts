import type { InboundMessage } from "../../core/routing/resolveRoute.js";
import type { MessageStateStore } from "../../core/message/messageState.js";
import type { RoutingMode } from "../../types.js";
import type { GroupAgentDispatchTarget } from "./groupPrepare.js";

interface GroupMessageStateParams {
    messageState: MessageStateStore;
    inbound: InboundMessage;
    routeKind: RoutingMode;
    targets: GroupAgentDispatchTarget[];
}

interface GroupDispatchCompletedParams extends GroupMessageStateParams {
    hasFailed: boolean;
}

function toStateFields(params: GroupMessageStateParams) {
    const { routeKind, targets } = params;
    return {
        routingMode: routeKind,
        targetAgentIds: targets.map((target) => target.agentId),
        sessionKeys: targets.map((target) => target.sessionKey),
    };
}

// 群聊调度开始时，只更新一条聚合状态，不让每个 Agent 覆盖整条消息。
export function markGroupDispatched(params: GroupMessageStateParams): void {
    const { messageState, inbound } = params;
    if (!messageState.get(inbound.messageId)) return;

    messageState.update(inbound.messageId, {
        status: "DISPATCHED",
        ...toStateFields(params),
    });
}

// 群聊所有 Agent 执行结束后，根据整体结果更新聚合状态。
export function markGroupCompleted(params: GroupDispatchCompletedParams): void {
    const { messageState, inbound, hasFailed } = params;
    if (!messageState.get(inbound.messageId)) return;

    messageState.update(inbound.messageId, {
        status: hasFailed ? "FAILED" : "CALLBACK_SENT",
        ...toStateFields(params),
    });
}
