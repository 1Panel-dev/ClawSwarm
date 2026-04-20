import type { AccountConfig } from "../../config.js";
import type { Logger } from "../../logging/logger.js";
import { markLocalOriginSession } from "../../openclaw/webchat/mirrorOriginRegistry.js";
import { buildSessionKey } from "../../core/routing/sessionKey.js";
import type { InboundMessage } from "../../core/routing/resolveRoute.js";
import { dedupeKeyForMessageAgent, type IdempotencyStore } from "../../storage/idempotency.js";
import type { RoutingMode } from "../../types.js";

export interface PrepareDirectDispatchParams {
    channelId: string;
    accountId: string;
    accountConfig: AccountConfig;
    logger: Logger;
    idempotency: IdempotencyStore;
    inbound: InboundMessage;
    agentId: string;
    routeKind: RoutingMode;
    traceId: string;
}

export interface PreparedDirectDispatch {
    deduped: boolean;
    sessionKey: string;
    baseLog: Logger;
}

// direct 调度执行前，统一准备会话、幂等和日志上下文。
export async function prepareDirectDispatch(params: PrepareDirectDispatchParams): Promise<PreparedDirectDispatch> {
    const { channelId, accountId, accountConfig, logger, idempotency, inbound, agentId, routeKind, traceId } = params;
    const sessionKey = buildSessionKey({
        agentId,
        chatType: inbound.chat.type,
        chatId: inbound.chat.chatId,
        routeKind,
        threadId: inbound.chat.threadId,
        useDedicatedDirectSession: inbound.useDedicatedDirectSession,
    });

    const first = await idempotency.setIfNotExists(
        dedupeKeyForMessageAgent({ accountId, messageId: inbound.messageId, agentId }),
        accountConfig.idempotency.ttlSeconds,
    );

    const baseLog = logger.child({
        traceId,
        accountId,
        messageId: inbound.messageId,
        agentId,
        sessionKey,
        routeKind,
    });

    if (!first) {
        baseLog.info({ deduped: true }, "deduped inbound message; skip run");
        return { deduped: true, sessionKey, baseLog };
    }

    if (channelId === "clawswarm" && routeKind === "DIRECT") {
        markLocalOriginSession(sessionKey);
    }

    return { deduped: false, sessionKey, baseLog };
}
