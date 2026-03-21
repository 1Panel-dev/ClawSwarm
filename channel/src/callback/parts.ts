/**
 * 这个文件负责把最终文本回复拆成富内容 parts。
 *
 * 当前 OpenClaw runtime 仍然主要返回文本，
 * 所以这里先走“兼容升级”策略：
 * 1. 保留原始 text，兼容旧的调度中心实现。
 * 2. 同时把文本里的约定标记拆成 parts，方便新前端直接渲染。
 *
 * 支持的结构：
 * - 普通 markdown 文本
 * - [[attachment:文件名|mimeType|url]]
 * - [[tool:标题|状态|摘要]]
 */
import type { CallbackMessagePart } from "../types.js";

const PART_PATTERN = /\[\[(attachment|tool):([^|\]]+)\|([^|\]]*)\|([^\]]+)\]\]/g;

export function buildCallbackMessageParts(text: string): CallbackMessagePart[] {
    const parts: CallbackMessagePart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = PART_PATTERN.exec(text)) !== null) {
        const [fullMatch, kind, first, second, third] = match;
        const textBefore = text.slice(lastIndex, match.index).trim();
        if (textBefore) {
            parts.push({
                kind: "markdown",
                content: textBefore,
            });
        }

        if (kind === "attachment") {
            parts.push({
                kind: "attachment",
                name: first.trim(),
                mimeType: second.trim() || null,
                url: third.trim(),
            });
        } else {
            parts.push({
                kind: "tool_card",
                title: first.trim(),
                status: normalizeToolStatus(second.trim()),
                summary: third.trim(),
            });
        }

        lastIndex = match.index + fullMatch.length;
    }

    const rest = text.slice(lastIndex).trim();
    if (rest || !parts.length) {
        parts.push({
            kind: "markdown",
            content: rest || text,
        });
    }

    return parts;
}

function normalizeToolStatus(value: string): "pending" | "running" | "completed" | "failed" {
    if (value === "running") return "running";
    if (value === "completed") return "completed";
    if (value === "failed") return "failed";
    return "pending";
}
