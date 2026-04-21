import { buildToolCardMarker } from "../../core/callback/callbackParts.js";

const INTERNAL_DIALOGUE_USER_PREFIX = "[ClawSwarm Agent Dialogue]";

export type TranscriptRecord = {
    id?: string;
    parentId?: string;
    message?: {
        role?: string;
        stopReason?: string;
        content?: Array<{
            type?: string;
            text?: string;
        }>;
        [key: string]: unknown;
    };
};

type TranscriptContentPart = {
    type?: string;
    text?: string;
    name?: string;
    arguments?: unknown;
    [key: string]: unknown;
};

type CompletedAssistantMessage = {
    messageId: string;
    content: string;
    parentId: string;
};

type CompletedUserMessage = {
    messageId: string;
    content: string;
};

export type MirrorableTranscriptMessage = {
    messageId: string;
    content: string;
    isTerminalAssistant: boolean;
};

export function summarizeToolArguments(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }
    try {
        return JSON.stringify(value, null, 2).trim();
    } catch {
        return String(value ?? "").trim();
    }
}

function summarizeUnknownPart(type: string, payload: unknown): string {
    const body = summarizeToolArguments(payload) || "{}";
    return `Transcript part (${type}):\n\`\`\`json\n${body}\n\`\`\``;
}

function extractAssistantText(record: TranscriptRecord | null): CompletedAssistantMessage | null {
    if (!record?.id || record.message?.role !== "assistant" || !Array.isArray(record.message.content)) {
        return null;
    }
    const stopReason = String(record.message.stopReason ?? "");
    if (stopReason && stopReason !== "stop") {
        return null;
    }
    const chunks = record.message.content
        .filter((part) => part?.type === "text" && typeof part.text === "string")
        .map((part) => part.text!.trim())
        .filter(Boolean);
    if (!chunks.length) {
        return null;
    }
    return {
        messageId: record.id.trim(),
        content: chunks.join("\n\n"),
        parentId: typeof record.parentId === "string" ? record.parentId.trim() : "",
    };
}

function extractTextChunks(parts: TranscriptContentPart[] | undefined): string[] {
    if (!Array.isArray(parts)) {
        return [];
    }
    return parts
        .filter((part) => part?.type === "text" && typeof part.text === "string")
        .map((part) => part.text!.trim())
        .filter(Boolean);
}

export function buildMirrorableTranscriptMessage(record: TranscriptRecord | null): MirrorableTranscriptMessage | null {
    if (!record?.id || !record.message) {
        return null;
    }

    const role = record.message.role;
    const contentParts = record.message.content;
    const chunks: string[] = [];

    if (role === "assistant") {
        if (Array.isArray(contentParts)) {
            for (const part of contentParts as TranscriptContentPart[]) {
                if (!part || typeof part !== "object") {
                    continue;
                }
                const type = part.type;
                if (!type || type === "thinking") {
                    continue;
                }
                if (type === "text") {
                    const text = typeof part.text === "string" ? part.text.trim() : "";
                    if (text) {
                        chunks.push(text);
                    }
                    continue;
                }
                if (type !== "toolCall") {
                    chunks.push(summarizeUnknownPart(type, part));
                    continue;
                }
                const toolName = String(part.name ?? "tool").trim();
                const argumentsSummary = summarizeToolArguments(part.arguments);
                chunks.push(buildToolCardMarker(toolName || "tool", "running", argumentsSummary || "tool call"));
            }
        }

        if (!chunks.length) {
            return null;
        }

        return {
            messageId: record.id.trim(),
            content: chunks.join("\n\n"),
            isTerminalAssistant: String(record.message.stopReason ?? "") === "stop",
        };
    }

    if (role === "toolResult") {
        const toolName = String((record.message as Record<string, unknown>).toolName ?? "tool").trim();
        const textChunks = extractTextChunks(contentParts as TranscriptContentPart[] | undefined);
        const details = (record.message as Record<string, unknown>).details;
        const detailsStatus =
            details && typeof details === "object"
                ? String((details as Record<string, unknown>).status ?? "").trim().toLowerCase()
                : "";
        const extraParts = Array.isArray(contentParts)
            ? contentParts
                  .filter((part) => part?.type && part.type !== "text" && part.type !== "thinking")
                  .map((part) => summarizeUnknownPart(String(part?.type ?? "unknown"), part))
            : [];
        const summary =
            [textChunks.join("\n\n"), extraParts.join("\n\n"), summarizeToolArguments(details)]
                .filter(Boolean)
                .join("\n\n") || "tool result";
        const status = detailsStatus === "error" ? "failed" : "completed";

        return {
            messageId: record.id.trim(),
            content: buildToolCardMarker(toolName || "tool", status, summary),
            isTerminalAssistant: false,
        };
    }

    return null;
}

function extractUserMessageId(record: TranscriptRecord | null): CompletedUserMessage | null {
    if (!record?.id || record.message?.role !== "user") {
        return null;
    }
    const chunks = Array.isArray(record.message.content)
        ? record.message.content
              .filter((part) => part?.type === "text" && typeof part.text === "string")
              .map((part) => part.text!.trim())
              .filter(Boolean)
        : [];
    return {
        messageId: record.id.trim(),
        content: chunks.join("\n\n"),
    };
}

function isInternalDialogueUserMessage(content: string): boolean {
    return content.trim().startsWith(INTERNAL_DIALOGUE_USER_PREFIX);
}

function parseTranscriptRecords(transcript: string): TranscriptRecord[] {
    const lines = transcript.split(/\r?\n/).filter((line) => line.trim());
    const parsedRecords: TranscriptRecord[] = [];
    for (const line of lines) {
        try {
            parsedRecords.push(JSON.parse(line) as TranscriptRecord);
        } catch {
            continue;
        }
    }
    return parsedRecords;
}

export function findAssistantReplyForTranscriptUser(
    transcript: string,
    transcriptUserMessageId: string,
): CompletedAssistantMessage | null {
    const parsedRecords = parseTranscriptRecords(transcript);
    const sourceIndex = parsedRecords.findIndex((record) => record.id?.trim() === transcriptUserMessageId);
    if (sourceIndex < 0) {
        return null;
    }

    let latestAssistant: CompletedAssistantMessage | null = null;
    for (let i = sourceIndex + 1; i < parsedRecords.length; i += 1) {
        const record = parsedRecords[i];
        const userMessage = extractUserMessageId(record);
        if (userMessage && !isInternalDialogueUserMessage(userMessage.content)) {
            break;
        }

        const assistantMessage = extractAssistantText(record);
        if (assistantMessage) {
            latestAssistant = assistantMessage;
        }
    }

    return latestAssistant;
}

export function findMirrorableMessagesForTranscriptUser(
    transcript: string,
    transcriptUserMessageId: string,
): MirrorableTranscriptMessage[] {
    const parsedRecords = parseTranscriptRecords(transcript);
    const sourceIndex = parsedRecords.findIndex((record) => record.id?.trim() === transcriptUserMessageId);
    if (sourceIndex < 0) {
        return [];
    }

    const messages: MirrorableTranscriptMessage[] = [];
    for (let i = sourceIndex + 1; i < parsedRecords.length; i += 1) {
        const record = parsedRecords[i];
        const userMessage = extractUserMessageId(record);
        if (userMessage && !isInternalDialogueUserMessage(userMessage.content)) {
            break;
        }

        const mirrorable = buildMirrorableTranscriptMessage(record);
        if (mirrorable) {
            messages.push(mirrorable);
        }
    }

    return messages;
}
