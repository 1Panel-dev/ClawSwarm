import { defineChannelPluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/core";

import {
    CHANNEL_ID,
    pluginConfigSchema,
    resolveAccount,
} from "../config.js";
import { createClawSwarmRoutes } from "../http/routes.js";
import { registerWebchatTranscriptMirror } from "../openclaw/webchat/webchatMirror.js";
import { createClawSwarmReadDocumentTool } from "../openclaw/tools/readDocumentTool.js";
import { createChannelSurface, createPluginLogger } from "./channelSurface.js";
import { createPluginRuntimeServices, describeRuntimeShape } from "./runtime.js";

function registerDocumentTool(api: OpenClawPluginApi) {
    api.registerTool(
        createClawSwarmReadDocumentTool({
            resolveAccount: (accountId?: string) => resolveAccount(api.config, accountId),
        }),
    );
}

function registerFullRuntimeSurfaces(api: OpenClawPluginApi) {
    const services = createPluginRuntimeServices(api);
    const { logger, openclaw, idempotency, messageState, clawSwarmFactory } = services;

    logger.info(describeRuntimeShape(api.runtime), "Plugin runtime shape detected");

    // 这里把 OpenClaw Web UI 里直接产生的 assistant 回复追加镜像到调度中心。
    // 它只监听 transcript 更新，不会接管或覆盖 ClawSwarm 现有消息。
    registerWebchatTranscriptMirror(api, logger);

    const handler = createClawSwarmRoutes({
        channelId: CHANNEL_ID,
        getAccount: (accountId?: string) => resolveAccount(api.config, accountId),
        logger,
        idempotency,
        messageState,
        clawSwarmFactory,
        openclaw,
        loadHostConfig: () => api.runtime?.config?.loadConfig?.(),
    });

    // 所有入站 HTTP 接口都统一挂在 /clawswarm/v1/ 前缀下。
    api.registerHttpRoute({
        path: "/clawswarm/v1/",
        match: "prefix",
        auth: "plugin",
        handler,
    });
}

function registerFull(api: OpenClawPluginApi) {
    registerDocumentTool(api);

    if (api.registrationMode === "tool-discovery") {
        return;
    }

    registerFullRuntimeSurfaces(api);
}

function withDefaultRegistrationMode(api: OpenClawPluginApi): OpenClawPluginApi {
    if (api.registrationMode) {
        return api;
    }

    return {
        ...api,
        registrationMode: "full",
    };
}

const plugin = {
    id: CHANNEL_ID,
    name: "ClawSwarm Channel",
    description: "Channel plugin bridging OpenClaw agents with ClawSwarm platform.",
    configSchema: pluginConfigSchema,
    register(api: OpenClawPluginApi) {
        const registrationApi = withDefaultRegistrationMode(api);
        const entry = defineChannelPluginEntry({
            id: CHANNEL_ID,
            name: "ClawSwarm Channel",
            description: "Channel plugin bridging OpenClaw agents with ClawSwarm platform.",
            configSchema: pluginConfigSchema,
            plugin: createChannelSurface({
                config: registrationApi.config,
                logger: createPluginLogger(registrationApi),
            }),
            registerFull,
        });

        entry.register(registrationApi);
    },
};

export default plugin;
