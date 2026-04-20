import { describe, expect, it, vi } from "vitest";

vi.mock("undici", () => ({
    request: vi.fn(),
}));

import { request } from "undici";

import { AccountConfigSchema } from "../config.js";
import { buildClawSwarmDocumentApiPath, readDocumentMarkdown } from "../flows/documents/readDocument.js";
import { handleDocumentRoutes } from "../http/documentRoutes.js";

const requestMock = vi.mocked(request);

const account = AccountConfigSchema.parse({
    baseUrl: "https://clawswarm.example.com",
    outboundToken: "outbound-token",
    inboundSigningSecret: "1234567890123456",
});

function createResponseRecorder() {
    return {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: "",
        setHeader(name: string, value: string) {
            this.headers[name.toLowerCase()] = value;
        },
        end(value: string) {
            this.body = value;
        },
    };
}

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
            readDocumentMarkdown({
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

    it("returns markdown from the generic document HTTP resolver", async () => {
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

        const res = createResponseRecorder();
        const handled = await handleDocumentRoutes({
            pathname: "/clawswarm/v1/documents/read",
            method: "GET",
            searchParams: new URLSearchParams({
                uri: "clawswarm://projects/project-1/documents/doc-1",
            }),
            res,
            getAccount: () => ({ ...account, accountId: "default" }),
        });

        expect(handled).toBe(true);
        expect(res.statusCode).toBe(200);
        expect(res.headers["content-type"]).toBe("text/markdown; charset=utf-8");
        expect(res.body).toBe("# 需求\n\n- A");
    });
});
