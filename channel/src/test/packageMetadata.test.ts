import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function readJson(relativePath: string) {
    const filePath = fileURLToPath(new URL(relativePath, import.meta.url));
    return JSON.parse(readFileSync(filePath, "utf8"));
}

describe("package metadata", () => {
    it("keeps package, lockfile, and OpenClaw manifest versions synchronized", () => {
        const packageJson = readJson("../../package.json");
        const packageLock = readJson("../../package-lock.json");
        const manifest = readJson("../../openclaw.plugin.json");

        expect(packageJson.version).toBe(manifest.version);
        expect(packageLock.version).toBe(packageJson.version);
        expect(packageLock.packages[""].version).toBe(packageJson.version);
    });

    it("declares explicit source and runtime entries for OpenClaw 2026.5.5 package loading", () => {
        const packageJson = readJson("../../package.json");

        expect(packageJson.openclaw.extensions).toEqual(["./src/index.ts"]);
        expect(packageJson.openclaw.runtimeExtensions).toEqual(["./dist/index.js"]);
        expect(packageJson.openclaw.setupEntry).toBe("./src/setup-entry.ts");
        expect(packageJson.openclaw.runtimeSetupEntry).toBe("./dist/setup-entry.js");
    });

    it("publishes only the expected runtime surface and user-facing package files", () => {
        const packageJson = readJson("../../package.json");

        expect(packageJson.files).toEqual(["dist", "skills", "openclaw.plugin.json", "README.md"]);
    });

    it("declares the OpenClaw 2026.5.5 tool ownership contract", () => {
        const manifest = readJson("../../openclaw.plugin.json");

        expect(manifest.contracts?.tools).toEqual(["clawswarm_read_document"]);
    });
});
