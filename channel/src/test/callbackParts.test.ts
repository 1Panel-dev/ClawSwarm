import { describe, expect, it } from "vitest";

import { buildCallbackMessageParts, buildToolCardMarker } from "../core/callback/callbackParts.js";

describe("callback part protocol", () => {
    it("parses markdown, tool cards, and attachments from callback text", () => {
        expect(
            buildCallbackMessageParts(
                [
                    "摘要",
                    "",
                    "[[tool:巡检|completed|全部正常]]",
                    "",
                    "[[attachment:报告.pdf|application/pdf|https://example.com/report.pdf]]",
                ].join("\n"),
            ),
        ).toEqual([
            { kind: "markdown", content: "摘要" },
            { kind: "tool_card", title: "巡检", status: "completed", summary: "全部正常" },
            {
                kind: "attachment",
                name: "报告.pdf",
                mimeType: "application/pdf",
                url: "https://example.com/report.pdf",
            },
        ]);
    });

    it("builds sanitized tool card markers", () => {
        expect(buildToolCardMarker("tool|name", "running", "line]one")).toBe("[[tool:tool name|running|line one]]");
    });
});
