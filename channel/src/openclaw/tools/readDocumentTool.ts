import type { AccountConfig } from "../../config.js";
import { ChannelError } from "../../core/errors/channelError.js";
import { readDocumentContent } from "../../flows/documents/readDocument.js";

export interface ClawSwarmReadDocumentToolParams {
    resolveAccount: () => AccountConfig;
}

interface ReadDocumentToolInput {
    uri?: unknown;
}

function normalizeToolInput(params: unknown): { uri: string } {
    const input = params && typeof params === "object" ? (params as ReadDocumentToolInput) : {};
    const uri = typeof input.uri === "string" ? input.uri.trim() : "";
    if (!uri) {
        throw new ChannelError({ message: "ClawSwarm document URI is required", kind: "bad_request" });
    }

    return { uri };
}

// 注册给 OpenClaw Agent 使用的文档读取工具，底层复用 channel 的统一读取逻辑。
export function createClawSwarmReadDocumentTool(params: ClawSwarmReadDocumentToolParams) {
    return {
        name: "clawswarm_read_document",
        label: "ClawSwarm Read Document",
        description: "Read a ClawSwarm document by clawswarm:// URI.",
        parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
                uri: {
                    type: "string",
                    description: "ClawSwarm document URI.",
                },
            },
            required: ["uri"],
        },
        async execute(_toolCallId: string, rawParams: unknown) {
            const input = normalizeToolInput(rawParams);
            const content = await readDocumentContent({
                account: params.resolveAccount(),
                uri: input.uri,
            });

            return {
                content: [{ type: "text" as const, text: content }],
                details: { uri: input.uri },
            };
        },
    };
}
