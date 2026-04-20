import type { Logger } from "../../logging/logger.js";
import type { AccountConfig } from "../../config.js";
import type { IdempotencyStore } from "../../storage/idempotency.js";
import type { MessageStateStore } from "../../core/message/messageState.js";
import type { InboundMessage } from "../../core/routing/resolveRoute.js";
import type { OpenClawRuntimeAdapter } from "../../openclaw/runtime/adapters.js";
import type { ClawSwarmCallbackClient } from "../callback/client.js";
import { prepareDirectDispatch } from "./directPrepare.js";
import { publishDirectAccepted, publishDirectChunk, publishDirectError, publishDirectFinal } from "./directPublish.js";
import { runDirectAgentTextTurn } from "./directRun.js";
import { markDirectCallbackSent, markDirectDispatched, markDirectFailed } from "./directState.js";

export interface DirectDispatchResult {
    ok: boolean;
    deduped?: boolean;
}

export interface DirectDispatchParams {
    channelId: string;
    accountId: string;
    accountConfig: AccountConfig;
    logger: Logger;

    idempotency: IdempotencyStore;
    messageState: MessageStateStore;
    clawSwarm: ClawSwarmCallbackClient;
    openclaw: OpenClawRuntimeAdapter;

    inbound: InboundMessage;
    agentId: string;
    routeKind: "DIRECT" | "GROUP_MENTION" | "GROUP_BROADCAST";
    traceId: string;
    updateMessageState?: boolean;
}

export async function dispatchDirect(params: DirectDispatchParams): Promise<DirectDispatchResult> {
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
        agentId,
        routeKind,
        traceId,
        updateMessageState = true,
    } = params;

    const prepared = await prepareDirectDispatch({
        channelId,
        accountId,
        accountConfig,
        logger,
        idempotency,
        inbound,
        agentId,
        routeKind,
        traceId,
    });
    const { sessionKey, baseLog } = prepared;
    if (prepared.deduped) {
        return { ok: true, deduped: true };
    }

    if (updateMessageState) {
        markDirectDispatched({ messageState, inbound, agentId, routeKind, sessionKey });
    }

    const publishContext = {
        clawSwarm,
        baseLog,
        accountConfig,
        inbound,
        agentId,
        sessionKey,
        routeKind,
    };

    await publishDirectAccepted(publishContext);

    try {
        const finalText = await runDirectAgentTextTurn({
            openclaw,
            accountConfig,
            channelId,
            accountId,
            agentId,
            sessionKey,
            inbound,
            onChunk: async (chunk) => {
                await publishDirectChunk({ ...publishContext, text: chunk.text, isFinal: chunk.isFinal });
            },
        });

        await publishDirectFinal({ ...publishContext, text: finalText });

        if (updateMessageState) {
            markDirectCallbackSent({ messageState, inbound, agentId, routeKind, sessionKey });
        }
        return { ok: true };
    } catch (err) {
        const error = String(err);
        baseLog.error({ err: error }, "agent run failed");
        await publishDirectError({ ...publishContext, error });

        if (updateMessageState) {
            markDirectFailed({ messageState, inbound, agentId, routeKind, sessionKey, error });
        }
        return { ok: false };
    }
}
