import type { ChannelPlugin, OpenClawConfig, OpenClawPluginApi } from "openclaw/plugin-sdk/core";

import {
    CHANNEL_ID,
    channelConfigSchema,
    channelConfigUiHints,
    listAccountIds,
    resolveAccount,
} from "../config.js";
import {
    looksLikeClawSwarmCsId,
    normalizeTargetCsId,
    resolveClawSwarmMessagingTarget,
    resolveClawSwarmTarget,
    sendClawSwarmText,
} from "../flows/outbound/sendText.js";
import { createLogger, type Logger, wrapOpenClawLogger } from "../logging/logger.js";

interface CreateMessagingConfigParams {
    logger: Logger;
}

interface CreateOutboundConfigParams {
    config: OpenClawConfig;
    logger: Logger;
}

export function createPluginLogger(api: Pick<OpenClawPluginApi, "logger">) {
    return createLogger({ sink: wrapOpenClawLogger(api.logger) });
}

function createMessagingConfig(params: CreateMessagingConfigParams) {
    const { logger } = params;

    return {
        // message 工具会先走 messaging.targetResolver，再进入 outbound.sendText。
        // 这里把合法 CS ID 识别成 direct target，才能让宿主认可这是合法目标。
        targetResolver: {
            looksLikeId: (raw: string, normalized?: string) => looksLikeClawSwarmCsId(raw, normalized),
            hint: "Use a CS ID like CSA-0009 or CSU-0001",
            resolveTarget: async ({ input, normalized }: { input: string; normalized: string }) => {
                const resolved = await resolveClawSwarmMessagingTarget({ input });
                if (!resolved) {
                    logger.warn(
                        {
                            rawTarget: input,
                            normalizedTarget: normalized,
                        },
                        "ClawSwarm messaging.resolveTarget could not resolve target",
                    );
                }
                return resolved;
            },
        },
        inferTargetChatType: ({ to }: { to: string }) => (looksLikeClawSwarmCsId(to) ? "direct" : undefined),
        parseExplicitTarget: ({ raw }: { raw: string }) => {
            try {
                return {
                    to: normalizeTargetCsId(raw),
                    chatType: "direct" as const,
                };
            } catch {
                logger.warn(
                    {
                        rawTarget: raw,
                    },
                    "ClawSwarm messaging.parseExplicitTarget rejected target",
                );
                return null;
            }
        },
        formatTargetDisplay: ({ target }: { target: string }) => target,
    };
}

function createOutboundConfig(params: CreateOutboundConfigParams) {
    const { config, logger } = params;

    return {
        // 当前先支持最小的结构化 sendText。
        // OpenClaw 侧把目标 CS ID 放在 to，正文放一个 JSON 模板；
        // 插件内部会把它转成正式的 ClawSwarm 业务请求，而不是直接调用 callback 入口。
        deliveryMode: "direct" as const,
        resolveTarget({ to }: { to?: string }) {
            const result = resolveClawSwarmTarget(to);
            if (!result.ok) {
                const rawTarget = String(to ?? "");
                logger.warn(
                    {
                        rawTarget,
                        rawTargetLength: rawTarget.length,
                        rawTargetCodePoints: Array.from(rawTarget).map((char) => char.codePointAt(0)),
                        error: result.error.message,
                    },
                    "ClawSwarm resolveTarget rejected target",
                );
            }
            return result;
        },
        async sendText(ctx: Parameters<typeof sendClawSwarmText>[0]["ctx"]) {
            const account = resolveAccount(config, ctx.accountId ?? undefined);
            logger.info(
                {
                    rawTarget: String(ctx.to ?? ""),
                    accountId: ctx.accountId ?? "default",
                    textPreview: String(ctx.text ?? "").slice(0, 240),
                },
                "ClawSwarm sendText received outbound request",
            );
            return await sendClawSwarmText({
                ctx,
                account,
                logger,
            });
        },
    };
}

export function createChannelSurface(params: { config: OpenClawConfig; logger: Logger }): ChannelPlugin {
    const { config, logger } = params;

    return {
        id: CHANNEL_ID,
        meta: {
            id: CHANNEL_ID,
            label: "ClawSwarm",
            selectionLabel: "ClawSwarm",
            docsPath: "/channels/clawswarm",
            blurb: "Bridge OpenClaw agents with ClawSwarm direct chat, group chat, and mention routing.",
        },
        capabilities: {
            chatTypes: ["direct", "group"] satisfies Array<"direct" | "group">,
        },
        configSchema: { schema: channelConfigSchema, uiHints: channelConfigUiHints },
        config: {
            listAccountIds,
            resolveAccount,
        },
        messaging: createMessagingConfig({ logger }),
        outbound: createOutboundConfig({ config, logger }),
    };
}
