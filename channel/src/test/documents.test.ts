import { describe, expect, it, vi } from "vitest";

vi.mock("undici", () => ({
    request: vi.fn(),
}));

import { request } from "undici";

import { AccountConfigSchema } from "../config.js";
import { buildClawSwarmDocumentApiPath, readDocumentContent } from "../flows/documents/readDocument.js";
import { createClawSwarmReadDocumentTool } from "../openclaw/tools/readDocumentTool.js";

const requestMock = vi.mocked(request);

const account = AccountConfigSchema.parse({
    baseUrl: "https://clawswarm.example.com",
    outboundToken: "outbound-token",
    inboundSigningSecret: "1234567890123456",
});

describe("clawswarm document links", () => {
    it("converts clawswarm document URIs to backend API paths", () => {
        expect(
            buildClawSwarmDocumentApiPath(
                "clawswarm://projects/d7e341a3-30de-40be-9545-f39cc1bddca8/documents/c9dc2a9c-19ea-41d2-a35e-b94871301190",
            ),
        ).toBe(
            "/api/v1/clawswarm/projects/d7e341a3-30de-40be-9545-f39cc1bddca8/documents/c9dc2a9c-19ea-41d2-a35e-b94871301190",
        );
        expect(buildClawSwarmDocumentApiPath("clawswarm://tasks/task-1/documents/doc-1")).toBe(
            "/api/v1/clawswarm/tasks/task-1/documents/doc-1",
        );

        expect(() => buildClawSwarmDocumentApiPath("https://example.com/doc")).toThrow("Invalid ClawSwarm document URI");
        expect(() => buildClawSwarmDocumentApiPath("clawswarm://projects/only-project")).toThrow("Invalid ClawSwarm document URI");
    });

    it("reads markdown content with the account outbound token", async () => {
        requestMock.mockResolvedValueOnce({
            statusCode: 200,
            body: {
                text: async () =>
                    JSON.stringify({
                        projectId: "project-1",
                        documentId: "doc-1",
                        name: "项目简介.md",
                        category: "其他",
                        content: "# 项目简介\n\n正文",
                        updatedAt: "2026-04-17T00:00:00Z",
                    }),
            },
        } as never);

        await expect(
            readDocumentContent({
                account,
                uri: "clawswarm://projects/project-1/documents/doc-1",
            }),
        ).resolves.toBe("# 项目简介\n\n正文");

        expect(requestMock).toHaveBeenCalledWith(
            "https://clawswarm.example.com/api/v1/clawswarm/projects/project-1/documents/doc-1",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    authorization: "Bearer outbound-token",
                }),
            }),
        );
    });

    it("reads documents through the OpenClaw tool", async () => {
        requestMock.mockResolvedValueOnce({
            statusCode: 200,
            body: {
                text: async () =>
                    JSON.stringify({
                        projectId: "project-1",
                        documentId: "doc-1",
                        name: "需求.md",
                        category: "需求",
                        content: "# 需求\n\n- A",
                        updatedAt: "2026-04-17T00:00:00Z",
                    }),
            },
        } as never);

        const tool = createClawSwarmReadDocumentTool({
            resolveAccount: () => account,
        });
        const result = await tool.execute("tool-call-1", {
            uri: "clawswarm://projects/project-1/documents/doc-1",
        });

        expect(result).toEqual({
            content: [{ type: "text", text: "# 需求\n\n- A" }],
            details: {
                uri: "clawswarm://projects/project-1/documents/doc-1",
            },
        });
    });
});
