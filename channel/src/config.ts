export { CHANNEL_ID } from "./config/constants.js";
import { AccountConfigSchema } from "./config/schema.js";
import { normalizeAccountConfigInput } from "./config/legacy.js";
import { getRawAccountConfig, listRawAccountIds } from "./config/host.js";

export {
    AccountConfigSchema,
    GatewayConfigSchema,
} from "./config/schema.js";
export {
    channelAccountConfigSchema,
    channelConfigSchema,
    channelConfigUiHints,
    pluginConfigSchema,
} from "./config/manifest.js";
export {
    describeAgents,
    discoverAgents,
    resolveAccountBootstrapConfig,
    resolveAliasMap,
    resolveAllowedAgents,
    resolveGatewayRuntimeConfig,
} from "./config/resolve.js";
export type {
    AccountConfig,
    AgentDirectoryEntry,
    GatewayRuntimeConfig,
    RawAccountConfig,
    ResolvedAccount,
} from "./config/types.js";

// 返回当前渠道下配置过的账号 id 列表。
export function listAccountIds(cfg: unknown): string[] {
    return listRawAccountIds(cfg);
}

// 解析账号配置，并由 Zod 负责默认值和结构校验。
export function resolveAccount(cfg: unknown, accountId?: string) {
    const resolvedAccountId = accountId ?? "default";
    const raw = getRawAccountConfig(cfg, resolvedAccountId);
    const parsed = AccountConfigSchema.parse(normalizeAccountConfigInput(raw));
    return { ...parsed, accountId: resolvedAccountId };
}
