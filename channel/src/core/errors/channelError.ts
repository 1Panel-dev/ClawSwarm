export type ChannelErrorKind = "bad_request" | "auth" | "upstream" | "timeout" | "internal";

export interface ChannelErrorOptions {
    message: string;
    kind: ChannelErrorKind;
    status?: number;
    retryable?: boolean;
    detail?: string;
    cause?: unknown;
}

// 统一描述 channel 内部可分类错误，避免上层只能解析普通 Error.message。
export class ChannelError extends Error {
    readonly kind: ChannelErrorKind;
    readonly status?: number;
    readonly retryable: boolean;
    readonly detail?: string;
    override readonly cause?: unknown;

    constructor(options: ChannelErrorOptions) {
        super(options.message);
        this.name = "ChannelError";
        this.kind = options.kind;
        this.status = options.status;
        this.retryable = options.retryable ?? (options.kind === "upstream" || options.kind === "timeout");
        this.detail = options.detail;
        this.cause = options.cause;
    }
}

export function getErrorDetail(error: unknown): string | undefined {
    if (error instanceof ChannelError) {
        return error.detail;
    }
    if (error instanceof Error && "detail" in error && typeof error.detail === "string") {
        return error.detail;
    }
    return undefined;
}
