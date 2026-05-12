type RegistrationMode =
    | "full"
    | "discovery"
    | "tool-discovery"
    | "cli-metadata"
    | "setup-only"
    | "setup-runtime";

interface DefineChannelPluginEntryParams {
    id: string;
    name: string;
    description: string;
    plugin: unknown;
    configSchema?: unknown;
    setRuntime?: (runtime: unknown) => void;
    registerCliMetadata?: (api: any) => void;
    registerFull?: (api: any) => void;
}

export function defineChannelPluginEntry(params: DefineChannelPluginEntryParams) {
    return {
        id: params.id,
        name: params.name,
        description: params.description,
        configSchema: params.configSchema,
        channelPlugin: params.plugin,
        register(api: { registrationMode?: RegistrationMode; runtime?: unknown; registerChannel: (registration: any) => void }) {
            if (api.registrationMode === "cli-metadata") {
                params.registerCliMetadata?.(api);
                return;
            }
            if (api.registrationMode === "tool-discovery") {
                params.registerFull?.(api);
                return;
            }
            api.registerChannel({ plugin: params.plugin });
            params.setRuntime?.(api.runtime);
            if (api.registrationMode === "discovery") {
                params.registerCliMetadata?.(api);
                return;
            }
            if (api.registrationMode !== "full") {
                return;
            }
            params.registerCliMetadata?.(api);
            params.registerFull?.(api);
        },
    };
}

export function defineSetupPluginEntry<TPlugin>(plugin: TPlugin) {
    return { plugin };
}

export const emptyPluginConfigSchema = {
    type: "object",
    additionalProperties: false,
    properties: {},
};
