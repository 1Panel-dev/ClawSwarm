import { describe, expect, it } from "vitest";

import {
    findAssistantReplyForTranscriptUser,
    findMirrorableMessagesForTranscriptUser,
} from "../../hooks/webchat-mirror/handler";

describe("findAssistantReplyForTranscriptUser", () => {
    it("returns the assistant reply that belongs to the specified transcript user message", () => {
        const transcript = [
            JSON.stringify({
                id: "user-1",
                message: {
                    role: "user",
                    content: [{ type: "text", text: "first question" }],
                },
            }),
            JSON.stringify({
                id: "assistant-1",
                parentId: "user-1",
                message: {
                    role: "assistant",
                    stopReason: "stop",
                    content: [{ type: "text", text: "first answer" }],
                },
            }),
            JSON.stringify({
                id: "user-2",
                message: {
                    role: "user",
                    content: [{ type: "text", text: "second question" }],
                },
            }),
            JSON.stringify({
                id: "assistant-2",
                parentId: "user-2",
                message: {
                    role: "assistant",
                    stopReason: "stop",
                    content: [{ type: "text", text: "second answer" }],
                },
            }),
        ].join("\n");

        expect(findAssistantReplyForTranscriptUser(transcript, "user-1")).toEqual({
            messageId: "assistant-1",
            parentId: "user-1",
            content: "first answer",
        });
    });

    it("returns the final assistant reply after internal claw-team dialogue user messages", () => {
        const transcript = [
            JSON.stringify({
                id: "user-1",
                message: {
                    role: "user",
                    content: [{ type: "text", text: "请你和 CTA-0010 对话三轮" }],
                },
            }),
            JSON.stringify({
                id: "internal-user-1",
                message: {
                    role: "user",
                    content: [{ type: "text", text: "[Claw Team Agent Dialogue]\nPartner: TestBot2" }],
                },
            }),
            JSON.stringify({
                id: "assistant-1",
                parentId: "internal-user-1",
                message: {
                    role: "assistant",
                    stopReason: "stop",
                    content: [{ type: "text", text: "已与 TestBot2 完成三轮对话。" }],
                },
            }),
            JSON.stringify({
                id: "user-2",
                message: {
                    role: "user",
                    content: [{ type: "text", text: "下一步做什么？" }],
                },
            }),
        ].join("\n");

        expect(findAssistantReplyForTranscriptUser(transcript, "user-1")).toEqual({
            messageId: "assistant-1",
            parentId: "internal-user-1",
            content: "已与 TestBot2 完成三轮对话。",
        });
    });

    it("returns all mirrorable transcript outputs for one webchat turn", () => {
        const transcript = [
            JSON.stringify({
                id: "user-1",
                message: {
                    role: "user",
                    content: [{ type: "text", text: "请通过 claw-team channel 联系 TestBot2" }],
                },
            }),
            JSON.stringify({
                id: "assistant-tool-call",
                parentId: "user-1",
                message: {
                    role: "assistant",
                    stopReason: "toolUse",
                    content: [
                        { type: "text", text: "我先尝试通过 claw-team 发送消息。" },
                        { type: "toolCall", name: "message", arguments: { target: "default" } },
                    ],
                },
            }),
            JSON.stringify({
                id: "tool-result-1",
                parentId: "assistant-tool-call",
                message: {
                    role: "toolResult",
                    toolName: "message",
                    details: { status: "error" },
                    content: [{ type: "text", text: "Unknown target \"default\" for Claw Team." }],
                },
            }),
            JSON.stringify({
                id: "assistant-final",
                parentId: "tool-result-1",
                message: {
                    role: "assistant",
                    stopReason: "stop",
                    content: [{ type: "text", text: "当前无法通过 claw-team channel 发送，请先完成配对。" }],
                },
            }),
        ].join("\n");

        expect(findMirrorableMessagesForTranscriptUser(transcript, "user-1")).toEqual([
            {
                messageId: "assistant-tool-call",
                content: "我先尝试通过 claw-team 发送消息。\n\n[[tool:message|running|{\n  \"target\": \"default\"\n}]]",
                isTerminalAssistant: false,
            },
            {
                messageId: "tool-result-1",
                content: '[[tool:message|failed|Unknown target "default" for Claw Team.\n\n{\n  "status": "error"\n}]]',
                isTerminalAssistant: false,
            },
            {
                messageId: "assistant-final",
                content: "当前无法通过 claw-team channel 发送，请先完成配对。",
                isTerminalAssistant: true,
            },
        ]);
    });

    it("omits thinking but preserves unknown assistant parts as raw summaries", () => {
        const transcript = [
            JSON.stringify({
                id: "user-1",
                message: {
                    role: "user",
                    content: [{ type: "text", text: "show me everything except thinking" }],
                },
            }),
            JSON.stringify({
                id: "assistant-1",
                parentId: "user-1",
                message: {
                    role: "assistant",
                    stopReason: "stop",
                    content: [
                        { type: "thinking", text: "internal reasoning" },
                        { type: "text", text: "visible text" },
                        { type: "attachment", name: "report.txt", url: "https://example.com/report.txt" },
                    ],
                },
            }),
        ].join("\n");

        expect(findMirrorableMessagesForTranscriptUser(transcript, "user-1")).toEqual([
            {
                messageId: "assistant-1",
                content:
                    'visible text\n\nTranscript part (attachment):\n```json\n{\n  "type": "attachment",\n  "name": "report.txt",\n  "url": "https://example.com/report.txt"\n}\n```',
                isTerminalAssistant: true,
            },
        ]);
    });
});
