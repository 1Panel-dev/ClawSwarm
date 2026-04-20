import crypto from "node:crypto";

import { buildSessionKey } from "../core/routing/sessionKey.js";
import { InboundMessageSchema, resolveRoute } from "../core/routing/resolveRoute.js";
import { verifyInboundSignature } from "./signature.js";
import type { ClawSwarmCallbackClient } from "../flows/callback/client.js";
import type { AccountConfig } from "../config.js";
import type { Logger } from "../logging/logger.js";
import type { OpenClawRuntimeAdapter } from "../openclaw/runtime/adapters.js";
import type { InboundMessage, RouteDecision } from "../core/routing/resolveRoute.js";
import type { IdempotencyStore } from "../storage/idempotency.js";
import type { MessageStateStore } from "../core/message/messageState.js";
import { runInboundDispatch } from "../flows/inbound/inboundDispatch.js";
import { readRawBody, sendJson, type HttpRequest, type HttpResponse } from "./common.js";
import { createInboundMessageState } from "./dispatchState.js";

export interface InboundRouteParams {
    pathname: string;
    method: string;
    req: HttpRequest;
    res: HttpResponse;
    channelId: string;
    getAccount: (accountId?: string) => AccountConfig & { accountId: string };
    logger: Logger;
    idempotency: IdempotencyStore;
    messageState: MessageStateStore;
    clawSwarmFactory: (acct: AccountConfig) => ClawSwarmCallbackClient;
    openclaw: OpenClawRuntimeAdapter;
}

interface ScheduleInboundDispatchParams {
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

export async function handleInboundRoute(params: InboundRouteParams): Promise<boolean> {
    const {
        pathname,
        method,
        req,
        res,
        channelId,
        getAccount,
        logger,
        idempotency,
        messageState,
        clawSwarmFactory,
        openclaw,
    } = params;

    // 这是最核心的 webhook：ClawSwarm 后端把用户消息投递到这里。
    if (pathname !== "/clawswarm/v1/inbound" || method !== "POST") {
        return false;
    }

    // 签名校验要基于默认账号配置中的安全参数和 body 限制。
    const acct = getAccount(undefined);

    let raw: Uint8Array;
    try {
        raw = await readRawBody(req, acct.limits.maxBodyBytes);
    } catch {
        sendJson(res, 413, { error: "body_too_large" });
        return true;
    }

    // 先验签，再做 JSON 解析，避免无效请求浪费后续处理资源。
    const sig = await verifyInboundSignature({
        req,
        rawBody: raw,
        pathname,
        nowMs: Date.now(),
        accountConfig: acct,
        nonceStore: idempotency,
    });

    if (!sig.ok) {
        sendJson(res, sig.status, { error: sig.reason });
        return true;
    }

    let json: unknown;
    try {
        json = JSON.parse(Buffer.from(raw).toString("utf8"));
    } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return true;
    }

    // 结构校验失败直接返回 400，避免非法数据进入后续流程。
    const parsed = InboundMessageSchema.safeParse(json);
    if (!parsed.success) {
        sendJson(res, 400, { error: "invalid_payload", detail: parsed.error.issues });
        return true;
    }

    const inbound = parsed.data;
    const accountId = inbound.accountId ?? sig.headers.accountId ?? "default";
    // traceId 用来贯穿一条消息的所有日志和状态变化。
    const traceId = crypto.randomUUID();

    const acct2 = getAccount(accountId);
    if (!acct2.enabled) {
        sendJson(res, 403, { error: "account_disabled" });
        return true;
    }

    const clawSwarm = clawSwarmFactory(acct2);

    // route decision 决定了这条消息最终打给谁。
    let decision: RouteDecision;
    try {
        decision = resolveRoute(inbound, acct2);
    } catch (err) {
        sendJson(res, 400, { error: "route_error", detail: String(err) });
        return true;
    }

    // 在真正异步执行前，先把消息状态记录好，后面排障就有抓手。
    createInboundMessageState({
        messageState,
        inbound,
        traceId,
        accountId,
        decision,
    });

    // 先 ACK 给调用方，后续真正的 Agent 执行在后台完成。
    sendJson(res, 200, {
        accepted: true,
        traceId,
        routeKind: decision.kind,
        targetAgentIds: decision.targetAgentIds,
        targetAgentCount: decision.targetAgentIds.length,
    });

    // 真正的 Agent 执行放到异步阶段，避免 webhook 长时间阻塞。
    scheduleInboundDispatch({
        channelId,
        accountId,
        accountConfig: acct2,
        logger,
        idempotency,
        messageState,
        clawSwarm,
        openclaw,
        inbound,
        decision,
        traceId,
    });

    return true;
}

function scheduleInboundDispatch(params: ScheduleInboundDispatchParams): void {
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
    } = params;
    const baseLog = logger.child({
        traceId,
        accountId,
        messageId: inbound.messageId,
        routeKind: decision.kind,
    });

    setImmediate(() => {
        void runInboundDispatch({
            channelId,
            accountId,
            accountConfig,
            logger: baseLog,
            idempotency,
            messageState,
            clawSwarm,
            openclaw,
            inbound,
            decision,
            traceId,
        });
    });
}
