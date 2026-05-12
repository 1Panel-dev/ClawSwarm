import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "openclaw/plugin-sdk/core": fileURLToPath(
                new URL("./src/test/openclawPluginSdkCoreMock.ts", import.meta.url),
            ),
        },
    },
    test: {
        include: ["src/test/**/*.test.ts"],
        environment: "node",
    },
});
