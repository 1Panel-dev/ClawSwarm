import type { RawAccountConfig } from "./types.js";

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const out = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return out.length > 0 ? out : undefined;
}

function parseAliasesJson(value: unknown): Record<string, string> | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
        return Object.fromEntries(
            Object.entries(parsed).filter(
                (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string",
            ),
        );
    } catch {
        return undefined;
    }
}

// normalizeAccountConfigInput 让代码同时兼容两种配置写法：
// 1. 旧版嵌套结构：gateway / agentDirectory / limits / idempotency / retry
// 2. UI 友好的扁平结构：gatewayBaseUrl / maxBroadcastAgents / retryMaxAttempts ...
// 3. 更保守的 UI 兼容结构：allowedAgentIdsCsv / retryJitterRatioPercent
// OpenClaw 当前控制台对 schema 支持范围比较有限，因此数组和 number 往往要退化成字符串或整数。
export function normalizeAccountConfigInput(raw: RawAccountConfig): RawAccountConfig {
    const gateway = (raw.gateway as RawAccountConfig | undefined) ?? {};
    const agentDirectory = (raw.agentDirectory as RawAccountConfig | undefined) ?? {};
    const limits = (raw.limits as RawAccountConfig | undefined) ?? {};
    const idempotency = (raw.idempotency as RawAccountConfig | undefined) ?? {};
    const retry = (raw.retry as RawAccountConfig | undefined) ?? {};

    return {
        ...raw,
        gateway: {
            ...gateway,
            baseUrl: asString(gateway.baseUrl) ?? asString(raw.gatewayBaseUrl),
            token: asString(gateway.token) ?? asString(raw.gatewayToken),
            transport: asString(gateway.transport) ?? asString(raw.gatewayTransport),
            model: asString(gateway.model) ?? asString(raw.gatewayModel),
            stream: asBoolean(gateway.stream) ?? asBoolean(raw.gatewayStream),
            allowInsecureTls:
                asBoolean(gateway.allowInsecureTls) ?? asBoolean(raw.gatewayAllowInsecureTls),
        },
        agentDirectory: {
            ...agentDirectory,
            allowedAgentIds:
                asStringArray(agentDirectory.allowedAgentIds) ??
                asStringArray(raw.allowedAgentIds) ??
                (typeof raw.allowedAgentIdsCsv === "string"
                    ? raw.allowedAgentIdsCsv
                          .split(",")
                          .map((item) => item.trim())
                          .filter((item) => item.length > 0)
                    : undefined),
            aliases:
                ((agentDirectory.aliases as Record<string, string> | undefined) ?? parseAliasesJson(raw.aliasesJson)),
        },
        limits: {
            ...limits,
            maxBroadcastAgents: asNumber(limits.maxBroadcastAgents) ?? asNumber(raw.maxBroadcastAgents),
            maxInFlightRuns: asNumber(limits.maxInFlightRuns) ?? asNumber(raw.maxInFlightRuns),
            perAgentConcurrency: asNumber(limits.perAgentConcurrency) ?? asNumber(raw.perAgentConcurrency),
            maxBodyBytes: asNumber(limits.maxBodyBytes) ?? asNumber(raw.maxBodyBytes),
            timeSkewMs: asNumber(limits.timeSkewMs) ?? asNumber(raw.timeSkewMs),
            nonceTtlSeconds: asNumber(limits.nonceTtlSeconds) ?? asNumber(raw.nonceTtlSeconds),
        },
        idempotency: {
            ...idempotency,
            mode: asString(idempotency.mode) ?? asString(raw.idempotencyMode),
            ttlSeconds: asNumber(idempotency.ttlSeconds) ?? asNumber(raw.idempotencyTtlSeconds),
            redisUrl: asString(idempotency.redisUrl) ?? asString(raw.redisUrl),
        },
        retry: {
            ...retry,
            maxAttempts: asNumber(retry.maxAttempts) ?? asNumber(raw.retryMaxAttempts),
            baseDelayMs: asNumber(retry.baseDelayMs) ?? asNumber(raw.retryBaseDelayMs),
            maxDelayMs: asNumber(retry.maxDelayMs) ?? asNumber(raw.retryMaxDelayMs),
            jitterRatio:
                asNumber(retry.jitterRatio) ??
                asNumber(raw.retryJitterRatio) ??
                (typeof raw.retryJitterRatioPercent === "number"
                    ? raw.retryJitterRatioPercent / 100
                    : undefined),
            deadLetterFile: asString(retry.deadLetterFile) ?? asString(raw.retryDeadLetterFile),
            callbackTimeoutMs:
                asNumber(retry.callbackTimeoutMs) ?? asNumber(raw.retryCallbackTimeoutMs),
        },
    };
}
