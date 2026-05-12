import { describe, expect, it, vi } from "vitest";

type RegistrationMode =
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

async function loadPluginWithRuntimeMocks() {
    vi.resetModules();

    const createPluginRuntimeServices = vi.fn();
    const describeRuntimeShape = vi.fn();
    const registerWebchatTranscriptMirror = vi.fn();

    vi.doMock("../app/runtime.js", () => ({
        createPluginRuntimeServices,
        describeRuntimeShape,
    }));
    vi.doMock("../openclaw/webchat/webchatMirror.js", () => ({
        registerWebchatTranscriptMirror,
    }));

    const { default: plugin } = await import("../index.js");

    return {
        plugin,
        createPluginRuntimeServices,
        describeRuntimeShape,
        registerWebchatTranscriptMirror,
    };
}

describe("plugin runtime registration boundary", () => {
    it.each(["discovery", "tool-discovery", "cli-metadata", "setup-only", "setup-runtime"] as const)(
        "does not construct full runtime services in %s mode",
        async (registrationMode) => {
            const { plugin, createPluginRuntimeServices, describeRuntimeShape, registerWebchatTranscriptMirror } =
                await loadPluginWithRuntimeMocks();

            plugin.register(createApi(registrationMode) as any);

            expect(createPluginRuntimeServices).not.toHaveBeenCalled();
            expect(describeRuntimeShape).not.toHaveBeenCalled();
            expect(registerWebchatTranscriptMirror).not.toHaveBeenCalled();
        },
    );
});
