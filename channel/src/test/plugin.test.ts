import { describe, expect, it, vi } from "vitest";

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
