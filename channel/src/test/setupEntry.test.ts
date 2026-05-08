import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import setupEntry from "../setup-entry.js";

describe("setup entry", () => {
    it("exports a lightweight channel plugin surface", () => {
        expect(setupEntry.plugin.id).toBe("clawswarm");
        expect(setupEntry.plugin.meta).toMatchObject({
            selectionLabel: "ClawSwarm",
            docsPath: "/channels/clawswarm",
            blurb: expect.stringContaining("ClawSwarm"),
        });
        expect(setupEntry.plugin.configSchema?.schema.properties.accounts).toBeDefined();
        expect(setupEntry.plugin.capabilities?.chatTypes).toEqual(["direct", "group"]);
    });

    it("declares source and runtime setup entries in package metadata", () => {
        const packagePath = fileURLToPath(new URL("../../package.json", import.meta.url));
        const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

        expect(packageJson.openclaw.extensions).toEqual(["./src/index.ts"]);
        expect(packageJson.openclaw.runtimeExtensions).toEqual(["./dist/index.js"]);
        expect(packageJson.openclaw.setupEntry).toBe("./src/setup-entry.ts");
        expect(packageJson.openclaw.runtimeSetupEntry).toBe("./dist/setup-entry.js");
    });
});
