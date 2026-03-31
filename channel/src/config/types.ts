import type { z } from "zod";

import type { AccountConfigSchema } from "./schema.js";

export type AccountConfig = z.infer<typeof AccountConfigSchema>;

export type ResolvedAccount = AccountConfig & { accountId: string };

export type AgentDirectoryEntry = {
    id: string;
    name: string;
    openclawAgentRef: string;
};

export type GatewayRuntimeConfig = {
    baseUrl: string;
    token?: string;
    transport: "auto" | "chat_completions" | "plugin_runtime";
    model: string;
    stream: boolean;
    allowInsecureTls: boolean;
};

export type RawAccountConfig = Record<string, unknown>;
