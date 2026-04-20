import type { ClawSwarmCallbackClient } from "../callback/client.js";
import type { AccountConfig } from "../../config.js";
import type { Logger } from "../../logging/logger.js";
import { buildCallbackMessageParts } from "../../core/callback/callbackParts.js";
import type { InboundMessage } from "../../core/routing/resolveRoute.js";
import type { RoutingMode } from "../../types.js";
import { emitDirectEvent } from "./directEvent.js";

interface DirectPublishParams {
    clawSwarm: ClawSwarmCallbackClient;
    baseLog: Logger;
    accountConfig: AccountConfig;
    inbound: InboundMessage;
    agentId: string;
    sessionKey: string;
    routeKind: RoutingMode;
}

export async function publishDirectAccepted(params: DirectPublishParams): Promise<void> {
    await emitDirectEvent({
        clawSwarm: params.clawSwarm,
        baseLog: params.baseLog,
        accountConfig: params.accountConfig,
        eventType: "run.accepted",
        inbound: params.inbound,
        agentId: params.agentId,
        sessionKey: params.sessionKey,
        payload: {
            routeKind: params.routeKind,
            chatType: params.inbound.chat.type,
            chatId: params.inbound.chat.chatId,
            threadId: params.inbound.chat.threadId ?? null,
        },
    });
}

export async function publishDirectChunk(params: DirectPublishParams & { text: string; isFinal: boolean }): Promise<void> {
    await emitDirectEvent({
        clawSwarm: params.clawSwarm,
        baseLog: params.baseLog,
        accountConfig: params.accountConfig,
        eventType: "reply.chunk",
        inbound: params.inbound,
        agentId: params.agentId,
        sessionKey: params.sessionKey,
        payload: { text: params.text, isFinal: params.isFinal },
    });
}

export async function publishDirectFinal(params: DirectPublishParams & { text: string }): Promise<void> {
    await emitDirectEvent({
        clawSwarm: params.clawSwarm,
        baseLog: params.baseLog,
        accountConfig: params.accountConfig,
        eventType: "reply.final",
        inbound: params.inbound,
        agentId: params.agentId,
        sessionKey: params.sessionKey,
        payload: {
            text: params.text,
            routeKind: params.routeKind,
            parts: buildCallbackMessageParts(params.text),
        },
    });
}

export async function publishDirectError(params: DirectPublishParams & { error: string }): Promise<void> {
    await emitDirectEvent({
        clawSwarm: params.clawSwarm,
        baseLog: params.baseLog,
        accountConfig: params.accountConfig,
        eventType: "run.error",
        inbound: params.inbound,
        agentId: params.agentId,
        sessionKey: params.sessionKey,
        payload: { error: params.error, routeKind: params.routeKind },
    });
}
