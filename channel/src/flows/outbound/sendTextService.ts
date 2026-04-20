import type { Logger } from "../../logging/logger.js";
import { CHANNEL_ID, type AccountConfig } from "../../config.js";
import { ChannelError, getErrorDetail } from "../../core/errors/channelError.js";
import { AGENT_DIALOGUE_START_KIND, parseAgentDialogueStartPayload } from "./sendTextContract.js";
import { postClawSwarmSendText } from "./sendTextHttp.js";
import { normalizeTargetCsId } from "./sendTextTarget.js";

type SendTextContext = {
    cfg: unknown;
    to: string;
    text: string;
    accountId?: string | null;
    replyToId?: string | null;
    threadId?: string | number | null;
    identity?: unknown;
    deps?: unknown;
    silent?: boolean;
};

type SendTextResult = {
    messageId: string;
    conversationId?: string;
    meta?: Record<string, unknown>;
};

export interface SendClawSwarmTextParams {
    ctx: SendTextContext;
    account: AccountConfig;
    logger: Logger;
}

export async function sendClawSwarmText(params: SendClawSwarmTextParams): Promise<SendTextResult> {
    let targetCsId = "";
    try {
        targetCsId = normalizeTargetCsId(params.ctx.to);
    } catch {
        params.logger.warn(
            {
                rawTarget: String(params.ctx.to ?? ""),
            },
            "ClawSwarm sendText received an invalid CS target",
        );
        throw new ChannelError({ message: "ClawSwarm target CS ID is invalid", kind: "bad_request" });
    }

    const payload = parseAgentDialogueStartPayload(params.ctx.text);

    try {
        const response = await postClawSwarmSendText({
            account: params.account,
            payload: {
                kind: payload.kind,
                sourceCsId: payload.sourceCsId,
                targetCsId,
                topic: payload.topic,
                message: payload.message,
                ...(payload.windowSeconds !== undefined ? { windowSeconds: payload.windowSeconds } : {}),
                ...(payload.softMessageLimit !== undefined ? { softMessageLimit: payload.softMessageLimit } : {}),
                ...(payload.hardMessageLimit !== undefined ? { hardMessageLimit: payload.hardMessageLimit } : {}),
            },
        });

        return {
            messageId: response.openingMessageId || `clawswarm:${CHANNEL_ID}:${response.dialogueId || "unknown"}`,
            ...(response.conversationId > 0 ? { conversationId: String(response.conversationId) } : {}),
            meta: {
                kind: AGENT_DIALOGUE_START_KIND,
                dialogueId: response.dialogueId,
                conversationId: response.conversationId,
                targetCsId,
            },
        };
    } catch (error) {
        params.logger.warn(
            {
                targetCsId,
                sourceCsId: payload.sourceCsId,
                body: getErrorDetail(error),
                error: error instanceof Error ? error.message : String(error),
            },
            "ClawSwarm sendText request failed",
        );
        throw error;
    }
}
