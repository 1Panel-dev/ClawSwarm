import { request } from "undici";

import type { AccountConfig } from "../../config.js";

interface AgentReadableDocument {
    content?: unknown;
}

export interface DocumentReadParams {
    account: AccountConfig;
    uri: string;
}

export function buildClawSwarmDocumentApiPath(uri: string): string {
    let parsed: URL;
    try {
        parsed = new URL(uri);
    } catch {
        throw new Error("invalid_clawswarm_document_uri");
    }

    const segments = [parsed.hostname, ...parsed.pathname.split("/").filter(Boolean)];
    if (parsed.protocol !== "clawswarm:" || segments.length < 3 || !segments.includes("documents")) {
        throw new Error("invalid_clawswarm_document_uri");
    }

    return `/api/v1/clawswarm/${segments.map(encodeURIComponent).join("/")}`;
}

export async function readDocumentMarkdown(params: DocumentReadParams): Promise<string> {
    const url = new URL(buildClawSwarmDocumentApiPath(params.uri), params.account.baseUrl).toString();
    const response = await request(url, {
        method: "GET",
        headers: {
            authorization: `Bearer ${params.account.outboundToken}`,
        },
        headersTimeout: params.account.retry.callbackTimeoutMs,
        bodyTimeout: params.account.retry.callbackTimeoutMs,
    });

    const text = await response.body.text().catch(() => "");
    if (response.statusCode < 200 || response.statusCode >= 300) {
        const error = new Error(`clawswarm_document_http_${response.statusCode}`);
        (error as Error & { detail?: string }).detail = text.slice(0, 300);
        throw error;
    }

    let body: AgentReadableDocument = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        throw new Error("clawswarm_document_invalid_json");
    }

    return typeof body.content === "string" ? body.content : "";
}
