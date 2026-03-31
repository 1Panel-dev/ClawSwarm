/**
 * 这里放 HTTP 路由共用的小工具。
 * 只保留和请求体读取、JSON 响应相关的基础能力。
 */

// 读取原始请求体时保留二进制内容，便于后续做签名校验。
export async function readRawBody(req: any, maxBytes: number): Promise<Uint8Array> {
    const chunks: Buffer[] = [];
    let total = 0;

    for await (const c of req) {
        const buf = Buffer.isBuffer(c) ? c : Buffer.from(c);
        total += buf.length;
        // 超过限制就立刻中断，避免继续吃内存。
        if (total > maxBytes) throw new Error("body_too_large");
        chunks.push(buf);
    }

    return Buffer.concat(chunks);
}

// 统一 JSON 响应格式，避免每个分支重复写 header。
export function sendJson(res: any, status: number, obj: unknown) {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
}
