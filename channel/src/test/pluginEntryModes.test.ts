import { describe, expect, it, vi } from "vitest";

import plugin from "../index.js";

type RegistrationMode =
    | "full"
    | "discovery"
    | "tool-discovery"
    | "cli-metadata"
    | "setup-only"
    | "setup-runtime";

function createApi(registrationMode: RegistrationMode) {
    return {
        id: "clawswarm",
        name: "ClawSwarm Channel",
        source: "test",
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

describe("plugin registration modes", () => {
    it("registers channel, tool, and HTTP routes in full mode", () => {
        const api = createApi("full");

        plugin.register(api as any);

        expect(api.registerChannel).toHaveBeenCalledTimes(1);
        expect(api.registerTool).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "clawswarm_read_document",
            }),
        );
        expect(api.registerHttpRoute).toHaveBeenCalledWith(
            expect.objectContaining({
                path: "/clawswarm/v1/",
                match: "prefix",
                auth: "plugin",
            }),
        );
    });

    it("registers only the channel surface in discovery mode", () => {
        const api = createApi("discovery");

        plugin.register(api as any);

        expect(api.registerChannel).toHaveBeenCalledTimes(1);
        expect(api.registerTool).not.toHaveBeenCalled();
        expect(api.registerHttpRoute).not.toHaveBeenCalled();
    });

    it("registers only tool descriptors in tool-discovery mode", () => {
        const api = createApi("tool-discovery");

        plugin.register(api as any);

        expect(api.registerChannel).not.toHaveBeenCalled();
        expect(api.registerTool).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "clawswarm_read_document",
            }),
        );
        expect(api.registerHttpRoute).not.toHaveBeenCalled();
    });

    it("does not register runtime surfaces in cli-metadata mode", () => {
        const api = createApi("cli-metadata");

        plugin.register(api as any);

        expect(api.registerChannel).not.toHaveBeenCalled();
        expect(api.registerTool).not.toHaveBeenCalled();
        expect(api.registerHttpRoute).not.toHaveBeenCalled();
    });

    it("keeps setup modes free of full runtime HTTP/tool registration", () => {
        for (const mode of ["setup-only", "setup-runtime"] as const) {
            const api = createApi(mode);

            plugin.register(api as any);

            expect(api.registerChannel).toHaveBeenCalledTimes(1);
            expect(api.registerTool).not.toHaveBeenCalled();
            expect(api.registerHttpRoute).not.toHaveBeenCalled();
        }
    });
});
