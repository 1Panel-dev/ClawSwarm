import { ChannelError } from "../../core/errors/channelError.js";
import type { AgentTurnParams, OpenClawRunChunk, OpenClawRuntimeAdapter, RuntimeLike } from "./runtimeTypes.js";
import {
    buildGatewayHeaders,
    buildGatewayUrlFromParams,
    extractText,
    getGatewayDispatcher,
    makeGatewayPayload,
    parseSseStream,
} from "./chatGateway.js";

type GatewayRequestInit = RequestInit & {
    dispatcher?: unknown;
};

// 这一层只负责 HTTP chatCompletions 调用，不做任何 transport 回退。
export function createChatCompletionsRuntimeAdapter(api: RuntimeLike): OpenClawRuntimeAdapter {
    return {
        async *runAgentTextTurn(params): AsyncIterable<OpenClawRunChunk> {
            const requestInit: GatewayRequestInit = {
                method: "POST",
                headers: buildGatewayHeaders(params),
                body: JSON.stringify(makeGatewayPayload(params)),
                dispatcher: getGatewayDispatcher(params),
            };
            const response = await fetch(buildGatewayUrlFromParams(params), requestInit);

            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                api.logger?.warn?.("OpenClaw gateway HTTP request failed", {
                    status: response.status,
                    body: errorText.slice(0, 500),
                });
                throw new ChannelError({
                    message: `OpenClaw gateway returned HTTP ${response.status}`,
                    kind: response.status === 401 || response.status === 403 ? "auth" : "upstream",
                    status: response.status,
                    detail: errorText.slice(0, 500),
                });
            }

            const contentType = response.headers.get("content-type") ?? "";
            if (contentType.includes("text/event-stream")) {
                if (!response.body) {
                    throw new ChannelError({
                        message: "OpenClaw gateway returned an empty SSE body",
                        kind: "upstream",
                    });
                }

                // SSE 场景会先产出增量 chunk，最后再补一个聚合 final，
                // 这样上层 callback 和 plugin_runtime 的输出形态保持一致。
                let emitted = false;
                let collected = "";
                for await (const chunk of parseSseStream(response.body)) {
                    emitted = true;
                    collected += chunk.text;
                    yield chunk;
                }

                if (emitted) {
                    yield { text: collected, isFinal: true };
                    return;
                }
            }

            const result = await response.json();
            const text = extractText(result);
            if (!text) {
                throw new ChannelError({
                    message: "OpenClaw gateway returned no readable text payload",
                    kind: "upstream",
                });
            }

            yield { text, isFinal: true };
        },
    };
}
