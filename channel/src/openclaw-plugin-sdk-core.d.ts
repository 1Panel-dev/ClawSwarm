/**
 * 这是本地补充的 OpenClaw SDK 类型声明。
 * 作用是让当前仓库在没有真实官方类型包的情况下也能完成类型检查和构建。
 *
 * 约束：
 * - 这里只补当前项目确实用到的最小接口。
 * - 如果宿主新增能力，优先按实际用法补声明，不在这里“猜全量 SDK”。
 */
declare module "openclaw/plugin-sdk/core" {
    export type OpenClawConfig = any;

    export type PluginRegistrationMode =
        | "full"
        | "discovery"
        | "tool-discovery"
        | "cli-metadata"
        | "setup-only"
        | "setup-runtime";

    export type PluginRuntime = any;

    // 这里只保留 ClawSwarm channel 实际用到的 ChannelPlugin 字段。
    export type ChannelPlugin<TResolvedAccount = any> = {
        id: string;
        meta?: {
            id: string;
            label: string;
            selectionLabel?: string;
            docsPath?: string;
            blurb?: string;
            aliases?: string[];
        };

        capabilities?: { chatTypes?: Array<"direct" | "group"> };

        // 宿主控制台会读取这里的 Channel 配置 schema，因此本地类型也要补上。
        configSchema?: {
            schema: any;
            uiHints?: Record<string, unknown>;
        };

        config: {
            listAccountIds: (cfg: OpenClawConfig) => string[];
            resolveAccount: (cfg: OpenClawConfig, accountId?: string) => TResolvedAccount;
        };

        messaging?: {
            parseExplicitTarget?: (args: { raw: string }) => {
                to: string;
                threadId?: string | number;
                chatType?: "direct" | "group";
            } | null;
            inferTargetChatType?: (args: { to: string }) => "direct" | "group" | undefined;
            formatTargetDisplay?: (args: {
                target: string;
                display?: string;
                kind?: "user" | "group" | "channel";
            }) => string;
            targetResolver?: {
                looksLikeId?: (raw: string, normalized?: string) => boolean;
                hint?: string;
                resolveTarget?: (args: {
                    cfg?: any;
                    accountId?: string | null;
                    input: string;
                    normalized: string;
                    preferredKind?: "user" | "group" | "channel";
                }) => Promise<{
                    to: string;
                    kind: "user" | "group" | "channel";
                    display?: string;
                    source?: "normalized" | "directory";
                } | null>;
            };
        };

        outbound: {
            deliveryMode: "direct" | "gateway" | "hybrid";
            resolveTarget?: (args: {
                cfg?: any;
                to?: string;
                allowFrom?: string[];
                accountId?: string | null;
                mode?: "explicit" | "implicit" | "heartbeat";
            }) => { ok: true; to: string } | { ok: false; error: Error };
            sendText: (args: any) => Promise<any>;
        };
    };

    export type OpenClawPluginApi = {
        config: OpenClawConfig;
        logger?: {
            info: Function;
            warn: Function;
            error: Function;
            debug?: Function;
        };
        // OpenClaw 2026.5.5 会提供 registrationMode；这里保留可选是为了兼容旧宿主和旧测试。
        registrationMode?: PluginRegistrationMode;
        runtime?: PluginRuntime;
        on?: <K extends string>(
            hookName: K,
            handler: (event: any, ctx: any) => Promise<any> | any,
            opts?: { priority?: number },
        ) => void;

        // registerChannel/registerHttpRoute 是当前插件最关键的两个宿主扩展点。
        registerChannel: (args: { plugin: ChannelPlugin<any> }) => void;
        registerTool: (tool: any, opts?: any) => void;
        registerHook?: (
            event: string,
            handler: (event: any) => Promise<any> | any,
            opts?: {
                name?: string;
                description?: string;
            },
        ) => void;
        registerHttpRoute: (args: {
            path: string;
            auth: "gateway" | "plugin";
            match?: "exact" | "prefix";
            replaceExisting?: boolean;
            handler: (req: any, res: any) => Promise<boolean> | boolean;
        }) => void;
    };

    // OpenClaw 2026.5.5 的 channel entry helper。只声明当前入口实际使用的字段。
    export function defineChannelPluginEntry<TPlugin extends ChannelPlugin<any>>(args: {
        id: string;
        name: string;
        description: string;
        plugin: TPlugin;
        configSchema?: any;
        setRuntime?: (runtime: PluginRuntime) => void;
        registerCliMetadata?: (api: OpenClawPluginApi) => void;
        registerFull?: (api: OpenClawPluginApi) => void;
    }): {
        id: string;
        name: string;
        description: string;
        configSchema: any;
        register: (api: OpenClawPluginApi) => void;
        channelPlugin: TPlugin;
        setChannelRuntime?: (runtime: PluginRuntime) => void;
    };

    export function defineSetupPluginEntry<TPlugin extends ChannelPlugin<any>>(plugin: TPlugin): {
        plugin: TPlugin;
    };
}
