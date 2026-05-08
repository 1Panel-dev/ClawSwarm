import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { AccountConfigSchema } from "../config.js";
import { createClawSwarmReadDocumentTool } from "../openclaw/tools/readDocumentTool.js";

const account = AccountConfigSchema.parse({
    baseUrl: "http://127.0.0.1:8080",
    outboundToken: "test-token",
    inboundSigningSecret: "1234567890123456",
});

function skillPath(relativePath: string) {
    return fileURLToPath(new URL(`../../skills/cs-chat/${relativePath}`, import.meta.url));
}

describe("cs-chat skill packaging", () => {
    it("keeps local reference links portable after plugin skill publication", () => {
        const skillMarkdown = readFileSync(skillPath("SKILL.md"), "utf8");
        const links = [...skillMarkdown.matchAll(/\]\(\.\/(references\/[^)]+)\)/g)].map((match) => match[1]);

        expect(links).toContain("references/json-contract.md");
        expect(links).toContain("references/document-read.md");
        expect(links).toContain("references/examples.md");
        expect(links).toContain("references/decision-rules.md");

        for (const link of links) {
            expect(existsSync(skillPath(link))).toBe(true);
        }
    });

    it("keeps the documented document-read tool name aligned with the registered tool", () => {
        const skillMarkdown = readFileSync(skillPath("SKILL.md"), "utf8");
        const documentReadReference = readFileSync(skillPath("references/document-read.md"), "utf8");
        const tool = createClawSwarmReadDocumentTool({
            resolveAccount: () => account,
        });

        expect(tool.name).toBe("clawswarm_read_document");
        expect(skillMarkdown).toContain(tool.name);
        expect(documentReadReference).toContain(tool.name);
    });
});
