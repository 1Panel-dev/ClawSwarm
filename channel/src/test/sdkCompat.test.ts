import { describe, expect, it, vi } from "vitest";
import type { ChannelPlugin, OpenClawPluginApi, PluginRegistrationMode } from "openclaw/plugin-sdk/core";

import { CHANNEL_ID } from "../config.js";
import plugin from "../index.js";
import setupEntry from "../setup-entry.js";

function createApi(registrationMode: PluginRegistrationMode): OpenClawPluginApi {
    return {
        config: {},
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        },
        registrationMode,
        runtime: { registrationMode },
        registerChannel: vi.fn(),
        registerTool: vi.fn(),
        registerHttpRoute: vi.fn(),
    };
}

describe("OpenClaw SDK compatibility shim", () => {
    it("keeps the runtime channel entry compatible with 2026.5.5 registration modes", () => {
        const api = createApi("discovery");

        plugin.register(api);

        expect(api.registerChannel).toHaveBeenCalledWith({
            plugin: expect.objectContaining({
                id: CHANNEL_ID,
            }),
        });
        expect(api.registerTool).not.toHaveBeenCalled();
        expect(api.registerHttpRoute).not.toHaveBeenCalled();
    });

    it("keeps the setup entry on the narrow setup plugin shape", () => {
        const setupPlugin: ChannelPlugin = setupEntry.plugin;

        expect(setupPlugin.id).toBe(CHANNEL_ID);
        expect(setupPlugin.configSchema?.schema.properties.accounts).toBeDefined();
    });
});
