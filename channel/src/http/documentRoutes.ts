import type { AccountConfig } from "../config.js";
import { readDocumentMarkdown } from "../flows/documents/readDocument.js";
import { sendJson, sendMarkdown, type HttpResponse } from "./common.js";

export interface DocumentRouteParams {
    pathname: string;
    method: string;
    searchParams: URLSearchParams;
    res: HttpResponse;
    getAccount: (accountId?: string) => AccountConfig & { accountId: string };
}

// Agent 只读文档入口：HTTP 层只负责参数、响应格式和错误输出。
export async function handleDocumentRoutes(params: DocumentRouteParams): Promise<boolean> {
    if (params.pathname !== "/clawswarm/v1/documents/read" || params.method !== "GET") {
        return false;
    }

    const uri = params.searchParams.get("uri")?.trim();
    if (!uri) {
        sendJson(params.res, 400, { error: "missing_uri" });
        return true;
    }

    try {
        const accountId = params.searchParams.get("accountId")?.trim() || undefined;
        const content = await readDocumentMarkdown({
            account: params.getAccount(accountId),
            uri,
        });
        sendMarkdown(params.res, 200, content);
    } catch (error) {
        sendJson(params.res, 400, {
            error: error instanceof Error ? error.message : String(error),
        });
    }
    return true;
}
