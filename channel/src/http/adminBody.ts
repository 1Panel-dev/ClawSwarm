import { verifyInboundSignature } from "./signature.js";
import type { AccountConfig } from "../config.js";
import type { IdempotencyStore } from "../storage/idempotency.js";
import { readRawBody, sendJson, type HttpRequest, type HttpResponse } from "./common.js";

export interface VerifiedJsonBodyParams {
    req: HttpRequest;
    res: HttpResponse;
    pathname: string;
    accountConfig: AccountConfig;
    idempotency: IdempotencyStore;
}

export async function readVerifiedJsonBody(params: VerifiedJsonBodyParams): Promise<{ ok: true; json: unknown } | { ok: false }> {
    const { req, res, pathname, accountConfig, idempotency } = params;

    let raw: Uint8Array;
    try {
        raw = await readRawBody(req, accountConfig.limits.maxBodyBytes);
    } catch {
        sendJson(res, 413, { error: "body_too_large" });
        return { ok: false };
    }

    const sig = await verifyInboundSignature({
        req,
        rawBody: raw,
        pathname,
        nowMs: Date.now(),
        accountConfig,
        nonceStore: idempotency,
    });

    if (!sig.ok) {
        sendJson(res, sig.status, { error: sig.reason });
        return { ok: false };
    }

    try {
        return {
            ok: true,
            json: JSON.parse(Buffer.from(raw).toString("utf8")),
        };
    } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return { ok: false };
    }
}
