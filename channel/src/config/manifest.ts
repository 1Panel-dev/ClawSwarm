// 这份 schema 提供给 OpenClaw 宿主做运行时配置声明。
// 这里尽量贴近 1panel 插件那种“极简、宽松”的 schema 风格，
// 优先保证 Control UI 能渲染；更严格的校验仍然交给 Zod 解析阶段处理。
export const pluginConfigSchema = {
    type: "object",
    properties: {
        enabled: {
            type: "boolean",
        },
        accounts: {
            type: "object",
            additionalProperties: {
                type: "object",
                properties: {
                    enabled: { type: "boolean" },
                    baseUrl: { type: "string" },
                    outboundToken: { type: "string" },
                    inboundSigningSecret: { type: "string" },
                    gatewayBaseUrl: { type: "string" },
                    gatewayToken: { type: "string" },
                    gatewayTransport: { type: "string" },
                    gatewayModel: { type: "string" },
                },
            },
        },
    },
} as const;

// 这是注册给 registerChannel({ plugin }) 的“账号级”表单 schema。
// OpenClaw 控制台在 Channel 配置页里，实际更像是读取这里，而不是外层 manifest 的总配置 schema。
// 因此它必须和 1panel 的形状接近：{ configSchema: { schema: ... } }。
export const channelAccountConfigSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        enabled: {
            type: "boolean",
            description: "选填：是否启用这个账号",
        },
        baseUrl: {
            type: "string",
            description: "必填：Claw Team 调度中心回调地址",
        },
        outboundToken: {
            type: "string",
            description: "必填：channel 回调 Claw Team 调度中心时使用的 Bearer Token",
        },
        inboundSigningSecret: {
            type: "string",
            description: "必填：Claw Team 调度中心调用 channel 时使用的签名密钥",
        },
        gatewayBaseUrl: {
            type: "string",
            description: "建议填写：OpenClaw Gateway 地址，不填时回退到默认值或环境变量",
        },
        gatewayToken: {
            type: "string",
            description: "建议填写：调用 OpenClaw Gateway 的 Bearer Token",
        },
        gatewayModel: {
            type: "string",
            description: "选填：调用 Gateway 时使用的模型名，默认 openclaw",
        },
        gatewayTransport: {
            type: "string",
            description: "选填：Gateway 传输层，默认 auto；可显式指定 chat_completions / plugin_runtime",
        },
    },
} as const;
