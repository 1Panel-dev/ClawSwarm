import { verifyInboundSignature } from "../security/signature.js";
import type { AccountConfig } from "../config.js";
import type { IdempotencyStore } from "../store/idempotency.js";
import { readRawBody, sendJson } from "./common.js";

export async function readVerifiedJsonBody(params: {
    req: any;
    res: any;
    pathname: string;
    accountConfig: AccountConfig;
    idempotency: IdempotencyStore;
}): Promise<{ ok: true; json: unknown } | { ok: false }> {
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
