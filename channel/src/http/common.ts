/**
 * 这里放 HTTP 路由共用的小工具。
 * 只保留和请求体读取、JSON 响应相关的基础能力。
 */

import { ChannelError } from "../core/errors/channelError.js";

export type HttpHeaderValue = string | string[] | undefined;

export type HttpHeaders = Record<string, HttpHeaderValue>;

// OpenClaw 宿主传入的是 Node 风格 req；这里定义最小能力，避免 HTTP 层继续透传 any。
export interface HttpRequest extends AsyncIterable<Buffer | Uint8Array | string> {
    url?: string;
    method?: string;
    headers?: HttpHeaders;
}

// OpenClaw 宿主传入的是 Node 风格 res；这里只声明 channel route 真正用到的响应能力。
export interface HttpResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(value?: string | Uint8Array): void;
}

// 统一读取请求头，兼容 Node 小写头名和部分测试里构造的大小写头名。
export function getHeaderValue(headers: HttpHeaders | undefined, name: string): string | undefined {
    const target = name.toLowerCase();
    const value = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === target)?.[1];
    if (Array.isArray(value)) return value[0];
    return value;
}

// 读取原始请求体时保留二进制内容，便于后续做签名校验。
export async function readRawBody(req: HttpRequest, maxBytes: number): Promise<Uint8Array> {
    const chunks: Buffer[] = [];
    let total = 0;

    for await (const c of req) {
        const buf = Buffer.isBuffer(c) ? c : Buffer.from(c);
        total += buf.length;
        // 超过限制就立刻中断，避免继续吃内存。
        if (total > maxBytes) {
            throw new ChannelError({ message: "HTTP request body is too large", kind: "bad_request" });
        }
        chunks.push(buf);
    }

    return Buffer.concat(chunks);
}

// 统一 JSON 响应格式，避免每个分支重复写 header。
export function sendJson(res: HttpResponse, status: number, obj: unknown) {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
}
