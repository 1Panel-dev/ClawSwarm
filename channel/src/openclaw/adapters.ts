/**
 * 这里只做 transport 组装和选择。
 * 具体实现都拆到独立 adapter 文件，方便后面单独删除 chat_completions
 * 或 plugin_runtime，而不会把 transport 判断逻辑一起扯坏。
 */
import { createChatCompletionsRuntimeAdapter } from "./chatCompletionsAdapter.js";
import { createPluginRuntimeAdapter } from "./pluginRuntimeAdapter.js";
import { shouldUseChatCompletions } from "./transportSelection.js";
import type { OpenClawRunChunk, OpenClawRuntimeAdapter, RuntimeLike } from "./runtimeTypes.js";
import type { AgentTurnParams } from "./runtimeTypes.js";
export type { OpenClawRunChunk, OpenClawRuntimeAdapter } from "./runtimeTypes.js";

function withTransport(params: AgentTurnParams, transport: AgentTurnParams["gateway"]["transport"]): AgentTurnParams {
    return {
        ...params,
        gateway: {
            ...params.gateway,
            transport,
        },
    };
}

function createTransportSwitch(params: {
    api: RuntimeLike;
    pluginRuntime: OpenClawRuntimeAdapter;
    chatCompletions: OpenClawRuntimeAdapter;
}): OpenClawRuntimeAdapter {
    const { api, pluginRuntime, chatCompletions } = params;

    const auto: OpenClawRuntimeAdapter = {
        async *runAgentTextTurn(turn): AsyncIterable<OpenClawRunChunk> {
            if (shouldUseChatCompletions(api)) {
                yield* chatCompletions.runAgentTextTurn(withTransport(turn, "chat_completions"));
                return;
            }

            yield* pluginRuntime.runAgentTextTurn(withTransport(turn, "plugin_runtime"));
        },
    };

    return {
        async *runAgentTextTurn(turn): AsyncIterable<OpenClawRunChunk> {
            // 显式 transport 永远优先，只有 auto 才去读宿主开关。
            if (turn.gateway.transport === "auto") {
                yield* auto.runAgentTextTurn(turn);
                return;
            }

            if (turn.gateway.transport === "plugin_runtime") {
                yield* pluginRuntime.runAgentTextTurn(turn);
                return;
            }

            yield* chatCompletions.runAgentTextTurn(turn);
        },
    };
}

export function createOpenClawRuntimeAdapter(api: RuntimeLike): OpenClawRuntimeAdapter {
    const pluginRuntime = createPluginRuntimeAdapter(api);
    const chatCompletions = createChatCompletionsRuntimeAdapter(api);
    return createTransportSwitch({
        api,
        pluginRuntime,
        chatCompletions,
    });
}

// 这个 mock adapter 主要供单元测试和本地无宿主环境时使用，
// 保持和真实 adapter 一样的 chunk/final 形态即可。
export function createMockOpenClawRuntimeAdapter(opts?: {
    prefix?: string;
    chunks?: number;
}): OpenClawRuntimeAdapter {
    const prefix = opts?.prefix ?? "mock";
    const chunks = opts?.chunks ?? 2;

    return {
        async *runAgentTextTurn(params): AsyncIterable<OpenClawRunChunk> {
            for (let i = 1; i <= chunks; i++) {
                yield { text: `${prefix}:${params.agentId}:chunk${i}` };
            }
            yield { text: `${prefix}:${params.agentId}:final`, isFinal: true };
        },
    };
}
