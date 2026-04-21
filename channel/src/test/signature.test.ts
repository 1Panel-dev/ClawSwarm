/**
 * 这些测试聚焦签名算法最底层的辅助函数。
 * 目的是尽早发现 canonical string 或哈希格式被意外修改。
 */
import { describe, expect, it } from "vitest";

import { buildCanonicalString, hmacSha256Hex, parseSignatureHeaders, sha256Hex } from "../http/signature.js";

describe("signature helpers", () => {
    it("builds canonical strings consistently", () => {
        const canonical = buildCanonicalString({
            timestampMs: 1000,
            nonce: "nonce-1",
            method: "POST",
            path: "/clawswarm/v1/inbound",
            bodySha256Hex: sha256Hex(Buffer.from("{\"ok\":true}")),
        });

        expect(canonical).toContain("/clawswarm/v1/inbound");
        expect(hmacSha256Hex("secret-1234567890", canonical)).toHaveLength(64);
    });

    it("parses signature headers regardless of header name casing", () => {
        expect(
            parseSignatureHeaders({
                headers: {
                    "X-OC-AccountId": "main",
                    "X-OC-Timestamp": "1000",
                    "X-OC-Nonce": "nonce-1",
                    "X-OC-Signature": `v1=${"a".repeat(64)}`,
                },
            }),
        ).toEqual({
            accountId: "main",
            timestampMs: 1000,
            nonce: "nonce-1",
            signatureHex: "a".repeat(64),
        });
    });
});
