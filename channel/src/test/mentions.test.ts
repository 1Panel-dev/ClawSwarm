import { describe, expect, it } from "vitest";

import { parseMentionsFromText } from "../core/routing/mentions.js";

describe("mention protocol", () => {
    it("extracts mention tokens from plain text", () => {
        expect(parseMentionsFromText("@pm 请和 @qa-1 同步一下，@agent_2 也看一下")).toEqual([
            "pm",
            "qa-1",
            "agent_2",
        ]);
    });
});
