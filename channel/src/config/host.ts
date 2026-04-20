import { CHANNEL_ID } from "./constants.js";
import type { RawAccountConfig } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// OpenClaw 宿主配置里，channel 插件配置统一挂在 channels.<CHANNEL_ID> 下。
export function getChannelConfigSection(cfg: unknown): RawAccountConfig {
    const root = asRecord(cfg);
    const channels = asRecord(root.channels);
    return asRecord(channels[CHANNEL_ID]);
}

// 读取账号原始配置。这里不做 schema 校验，只负责从宿主配置中安全取值。
export function getRawAccountConfig(cfg: unknown, accountId = "default"): RawAccountConfig {
    const section = getChannelConfigSection(cfg);
    const accounts = asRecord(section.accounts);
    return asRecord(accounts[accountId]);
}

// 返回当前 channel 下显式配置过的账号 id。
export function listRawAccountIds(cfg: unknown): string[] {
    const section = getChannelConfigSection(cfg);
    const accounts = asRecord(section.accounts);
    return Object.keys(accounts);
}
