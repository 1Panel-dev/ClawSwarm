import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import plugin from "../index.js";

describe("plugin registerChannel config schema", () => {
    it("registers channel root schema under channels.<id> with wildcard uiHints", () => {
        const registerChannel = vi.fn();
        const registerHttpRoute = vi.fn();
        const registerTool = vi.fn();

        plugin.register({
            config: {},
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            runtime: {},
            registerChannel,
            registerHttpRoute,
            registerTool,
        } as any);

        expect(registerChannel).toHaveBeenCalledTimes(1);
        expect(registerTool).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "clawswarm_read_document",
            }),
        );
        const registration = registerChannel.mock.calls[0][0];
        expect(registration.plugin.configSchema.schema.properties.accounts).toBeDefined();
        expect(registration.plugin.configSchema.schema.properties.baseUrl).toBeUndefined();
        expect(registration.plugin.configSchema.uiHints["accounts.*.outboundToken"]).toEqual({
            sensitive: true,
            label: "Outbound Token",
        });
    });
});

describe("openclaw.plugin.json channel config metadata", () => {
    it("publishes channelConfigs for OpenClaw 2026.4.11 config pages", () => {
        const manifestPath = fileURLToPath(new URL("../../openclaw.plugin.json", import.meta.url));
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

        expect(manifest.channelConfigs.clawswarm.schema).toEqual(manifest.configSchema);
        expect(manifest.channelConfigs.clawswarm.uiHints).toEqual(manifest.uiHints);
    });
});
