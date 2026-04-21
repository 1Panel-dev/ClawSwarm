import type { ClawSwarmCallbackClient } from "../callback/client.js";
import type { AccountConfig } from "../../config.js";
import type { OpenClawRuntimeAdapter } from "../../openclaw/runtime/adapters.js";
import type { Logger } from "../../logging/logger.js";
import type { InboundMessage, RouteDecision } from "../../core/routing/resolveRoute.js";
import type { IdempotencyStore } from "../../storage/idempotency.js";
import type { MessageStateStore } from "../../core/message/messageState.js";
import { dispatchDirect, type DirectDispatchResult } from "../dispatch/dispatchDirect.js";
import { dispatchGroup } from "../dispatch/dispatchGroup.js";

type DispatchDirectFn = typeof dispatchDirect;
type DispatchGroupFn = typeof dispatchGroup;

export interface InboundDispatchDependencies {
    dispatchDirectFn?: DispatchDirectFn;
    dispatchGroupFn?: DispatchGroupFn;
}

export interface InboundDispatchParams extends InboundDispatchDependencies {
    channelId: string;
    accountId: string;
    accountConfig: AccountConfig;
    logger: Logger;
    idempotency: IdempotencyStore;
    messageState: MessageStateStore;
    clawSwarm: ClawSwarmCallbackClient;
    openclaw: OpenClawRuntimeAdapter;
    inbound: InboundMessage;
    decision: RouteDecision;
    traceId: string;
}

interface DispatchDecisionParams extends InboundDispatchParams {
    dispatchDirectFn: DispatchDirectFn;
    dispatchGroupFn: DispatchGroupFn;
}

interface BackgroundDispatchFailureParams {
    logger: Logger;
    messageState: MessageStateStore;
    inbound: InboundMessage;
    decision: RouteDecision;
    err: unknown;
}

// inbound 后台执行入口：根据路由决策把消息交给 direct 或 group 调度。
export async function runInboundDispatch(params: InboundDispatchParams): Promise<DirectDispatchResult | void> {
    const dispatchParams: DispatchDecisionParams = {
        ...params,
        dispatchDirectFn: params.dispatchDirectFn ?? dispatchDirect,
        dispatchGroupFn: params.dispatchGroupFn ?? dispatchGroup,
    };

    try {
        return await dispatchDecision(dispatchParams);
    } catch (err) {
        markBackgroundDispatchFailed({
            logger: params.logger,
            messageState: params.messageState,
            inbound: params.inbound,
            decision: params.decision,
            err,
        });
    }
}

async function dispatchDecision(params: DispatchDecisionParams): Promise<DirectDispatchResult | void> {
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
        decision,
        traceId,
        dispatchDirectFn,
        dispatchGroupFn,
    } = params;

    if (decision.kind === "DIRECT") {
        return await dispatchDirectFn({
            channelId,
            accountId,
            accountConfig,
            logger,
            idempotency,
            messageState,
            clawSwarm,
            openclaw,
            inbound,
            agentId: decision.targetAgentIds[0],
            routeKind: decision.kind,
            traceId,
        });
    }

    await dispatchGroupFn({
        channelId,
        accountId,
        accountConfig,
        logger,
        idempotency,
        messageState,
        clawSwarm,
        openclaw,
        inbound,
        agentIds: decision.targetAgentIds,
        routeKind: decision.kind,
        traceId,
    });
}

// 后台调度异常必须落到状态表和日志，否则 webhook 已 ACK 后很难排查。
function markBackgroundDispatchFailed(params: BackgroundDispatchFailureParams): void {
    const { logger, messageState, inbound, decision, err } = params;
    if (messageState.get(inbound.messageId)) {
        messageState.update(inbound.messageId, {
            status: "FAILED",
            routingMode: decision.kind,
            targetAgentIds: decision.targetAgentIds,
            sessionKeys: [],
            error: String(err),
        });
    }
    logger.error({ err: String(err) }, "async dispatch failed");
}
