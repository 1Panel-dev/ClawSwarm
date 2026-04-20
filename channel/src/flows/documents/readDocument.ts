import { request } from "undici";

import type { AccountConfig } from "../../config.js";
import { ChannelError } from "../../core/errors/channelError.js";

interface AgentReadableDocument {
    content?: unknown;
}

export interface ReadDocumentContentParams {
    account: AccountConfig;
    uri: string;
}

export function buildClawSwarmDocumentApiPath(uri: string): string {
    let parsed: URL;
    try {
        parsed = new URL(uri);
    } catch {
        throw new ChannelError({ message: "Invalid ClawSwarm document URI", kind: "bad_request" });
    }

    const segments = [parsed.hostname, ...parsed.pathname.split("/").filter(Boolean)];
    if (parsed.protocol !== "clawswarm:" || segments.length < 3 || !segments.includes("documents")) {
        throw new ChannelError({ message: "Invalid ClawSwarm document URI", kind: "bad_request" });
    }

    return `/api/v1/clawswarm/${segments.map(encodeURIComponent).join("/")}`;
}

export async function readDocumentContent(params: ReadDocumentContentParams): Promise<string> {
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
        throw new ChannelError({
            message: `ClawSwarm document API returned HTTP ${response.statusCode}`,
            kind: response.statusCode === 401 || response.statusCode === 403 ? "auth" : "upstream",
            status: response.statusCode,
            detail: text.slice(0, 300),
        });
    }

    let body: AgentReadableDocument = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        throw new ChannelError({
            message: "ClawSwarm document API returned invalid JSON",
            kind: "upstream",
            detail: text.slice(0, 300),
        });
    }

    return typeof body.content === "string" ? body.content : "";
}
