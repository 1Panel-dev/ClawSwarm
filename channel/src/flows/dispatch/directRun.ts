import { resolveGatewayRuntimeConfig, type AccountConfig } from "../../config.js";
import type { OpenClawRuntimeAdapter } from "../../openclaw/runtime/adapters.js";
import type { InboundMessage } from "../../core/routing/resolveRoute.js";

export interface DirectRunChunk {
    text: string;
    isFinal: boolean;
}

export interface DirectRunParams {
    openclaw: OpenClawRuntimeAdapter;
    accountConfig: AccountConfig;
    channelId: string;
    accountId: string;
    agentId: string;
    sessionKey: string;
    inbound: InboundMessage;
    onChunk: (chunk: DirectRunChunk) => Promise<void>;
}

// 执行单个 Agent 的文本回合，并把流式 chunk 交给调用方处理。
export async function runDirectAgentTextTurn(params: DirectRunParams): Promise<string> {
    const { openclaw, accountConfig, channelId, accountId, agentId, sessionKey, inbound, onChunk } = params;
    let finalText = "";

    for await (const chunk of openclaw.runAgentTextTurn({
        agentId,
        channelId,
        accountId,
        sessionKey,
        peer: {
            kind: inbound.chat.type,
            id: inbound.chat.chatId,
            threadId: inbound.chat.threadId,
        },
        from: inbound.from,
        text: inbound.text,
        gateway: resolveGatewayRuntimeConfig(accountConfig),
    })) {
        const isAggregatedFinalDuplicate =
            !!chunk.isFinal && !!chunk.text && finalText.length > 0 && chunk.text === finalText;

        if (chunk.text && !isAggregatedFinalDuplicate) {
            finalText += chunk.text;
            await onChunk({ text: chunk.text, isFinal: !!chunk.isFinal });
        }
        if (chunk.isFinal) break;
    }

    return finalText;
}
