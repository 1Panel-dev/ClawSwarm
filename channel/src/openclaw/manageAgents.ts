/**
 * 这个文件负责通过 OpenClaw CLI 管理真实 Agent。
 *
 * 目前先支持最小能力：
 * 1. 创建真实 Agent
 * 2. 设置展示名称
 * 3. 读写 SOUL.md / USER.md / MEMORY.md
 *
 * 这样 claw-team 的“新增 Agent”就不再只是写调度中心数据库，
 * 而是能真正把 Agent 建到 OpenClaw 宿主里，再同步回来。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AgentDescriptor } from "../types.js";

type OpenClawCliAgent = {
    id?: string;
    name?: string;
};

type OpenClawAgentWorkspaceConfig = {
    agents?: {
        defaults?: {
            workspace?: string;
        };
        list?: Array<{
            id?: string;
            workspace?: string;
        }>;
    };
};

export type AgentProfileFiles = {
    identityMd: string;
    soulMd: string;
    userMd: string;
    memoryMd: string;
};

const OPENCLAW_STATE_DIR = path.join(os.homedir(), ".openclaw");
const DEFAULT_AGENT_ID = "main";
const DEFAULT_SOUL_TEMPLATE = `# SOUL.md

You are this agent's persona definition.

Describe:
- role and responsibilities
- tone and communication style
- behavioral boundaries
`;

const DEFAULT_IDENTITY_TEMPLATE = `# IDENTITY.md

- Name:
- Emoji:
- Theme:
- Creature:
- Vibe:
- Avatar:
`;

const DEFAULT_USER_TEMPLATE = `# USER.md

Record user information here.

Examples:
- user's name
- preferences
- collaboration style
`;

const DEFAULT_MEMORY_TEMPLATE = `# MEMORY.md

Keep durable long-term memory here.

Examples:
- important project facts
- stable preferences
- decisions worth remembering
`;

const AGENT_PROFILE_DEFAULTS: AgentProfileFiles = {
    identityMd: DEFAULT_IDENTITY_TEMPLATE,
    soulMd: DEFAULT_SOUL_TEMPLATE,
    userMd: DEFAULT_USER_TEMPLATE,
    memoryMd: DEFAULT_MEMORY_TEMPLATE,
};

const AGENT_PROFILE_FILENAMES = {
    identityMd: "IDENTITY.md",
    soulMd: "SOUL.md",
    userMd: "USER.md",
    memoryMd: "MEMORY.md",
} as const;

// 容器环境里不同镜像的安装位置可能不同，这里按常见候选顺序尝试。
function runOpenClawCli(args: string[]): string {
    for (const command of ["/usr/local/bin/openclaw", "openclaw"]) {
        try {
            return execFileSync(command, args, {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
            });
        } catch {
            // try next candidate
        }
    }
    throw new Error("openclaw_cli_unavailable");
}

// CLI --json 输出前后偶尔会混进日志，这里从原始文本里尽量提取首个对象。
function extractJsonObject(raw: string): Record<string, unknown> | null {
    const start = raw.indexOf("{");
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < raw.length; i += 1) {
        const ch = raw[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === "\"") {
                inString = false;
            }
            continue;
        }

        if (ch === "\"") {
            inString = true;
            continue;
        }

        if (ch === "{") {
            depth += 1;
            continue;
        }

        if (ch === "}") {
            depth -= 1;
            if (depth === 0) {
                try {
                    const parsed = JSON.parse(raw.slice(start, i + 1));
                    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                        ? (parsed as Record<string, unknown>)
                        : null;
                } catch {
                    return null;
                }
            }
        }
    }

    return null;
}

// list 场景同理，尽量从原始输出里提取首个 JSON 数组。
function extractJsonArray(raw: string): unknown[] | null {
    const start = raw.indexOf("[");
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < raw.length; i += 1) {
        const ch = raw[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === "\"") {
                inString = false;
            }
            continue;
        }

        if (ch === "\"") {
            inString = true;
            continue;
        }

        if (ch === "[") {
            depth += 1;
            continue;
        }

        if (ch === "]") {
            depth -= 1;
            if (depth === 0) {
                try {
                    const parsed = JSON.parse(raw.slice(start, i + 1));
                    return Array.isArray(parsed) ? parsed : null;
                } catch {
                    return null;
                }
            }
        }
    }

    return null;
}

export function listRealOpenClawAgents(): AgentDescriptor[] {
    const output = runOpenClawCli(["agents", "list", "--json"]);
    const parsed = extractJsonArray(output);
    if (!parsed) return [];

    return parsed
        .map((item) => item as OpenClawCliAgent)
        .filter((item): item is OpenClawCliAgent & { id: string } => typeof item?.id === "string" && item.id.trim().length > 0)
        .map((item) => ({
            id: item.id,
            name: typeof item.name === "string" && item.name.trim().length > 0 ? item.name : item.id,
            openclawAgentRef: item.id,
        }));
}

function resolveUserPath(rawPath: string): string {
    if (!rawPath) {
        return rawPath;
    }
    if (rawPath === "~") {
        return os.homedir();
    }
    if (rawPath.startsWith("~/")) {
        return path.join(os.homedir(), rawPath.slice(2));
    }
    return rawPath;
}

function normalizeAgentId(agentId: string): string {
    return agentId.trim().toLowerCase();
}

function resolveAgentWorkspaceDir(agentId: string, cfg?: OpenClawAgentWorkspaceConfig): string {
    const normalizedAgentId = normalizeAgentId(agentId);
    const configuredWorkspace = cfg?.agents?.list
        ?.find((entry) => normalizeAgentId(String(entry?.id ?? "")) === normalizedAgentId)
        ?.workspace
        ?.trim();
    if (configuredWorkspace) {
        return path.resolve(resolveUserPath(configuredWorkspace));
    }

    const defaultWorkspace = cfg?.agents?.defaults?.workspace?.trim();
    if (normalizedAgentId === DEFAULT_AGENT_ID) {
        if (defaultWorkspace) {
            return path.resolve(resolveUserPath(defaultWorkspace));
        }
        return path.join(OPENCLAW_STATE_DIR, "workspace");
    }

    return path.join(OPENCLAW_STATE_DIR, `workspace-${normalizedAgentId}`);
}

function ensureWorkspaceDir(workspaceDir: string): void {
    fs.mkdirSync(workspaceDir, { recursive: true });
}

function buildAgentProfileFilePaths(workspaceDir: string) {
    return {
        identityMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.identityMd),
        soulMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.soulMd),
        userMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.userMd),
        memoryMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.memoryMd),
    };
}

function withDefaultProfileFiles(partial?: Partial<AgentProfileFiles>): AgentProfileFiles {
    return {
        identityMd: partial?.identityMd?.trim() ? partial.identityMd : AGENT_PROFILE_DEFAULTS.identityMd,
        soulMd: partial?.soulMd?.trim() ? partial.soulMd : AGENT_PROFILE_DEFAULTS.soulMd,
        userMd: partial?.userMd?.trim() ? partial.userMd : AGENT_PROFILE_DEFAULTS.userMd,
        memoryMd: partial?.memoryMd?.trim() ? partial.memoryMd : AGENT_PROFILE_DEFAULTS.memoryMd,
    };
}

function writeAgentProfileFiles(params: {
    agentId: string;
    profileFiles?: Partial<AgentProfileFiles>;
    cfg?: OpenClawAgentWorkspaceConfig;
}): AgentProfileFiles {
    const workspaceDir = resolveAgentWorkspaceDir(params.agentId, params.cfg);
    ensureWorkspaceDir(workspaceDir);
    const filePaths = buildAgentProfileFilePaths(workspaceDir);
    const nextFiles = withDefaultProfileFiles(params.profileFiles);

    // 这里始终写成完整文件，避免出现空文件或部分字段缺失导致的行为漂移。
    fs.writeFileSync(filePaths.identityMd, nextFiles.identityMd, "utf8");
    fs.writeFileSync(filePaths.soulMd, nextFiles.soulMd, "utf8");
    fs.writeFileSync(filePaths.userMd, nextFiles.userMd, "utf8");
    fs.writeFileSync(filePaths.memoryMd, nextFiles.memoryMd, "utf8");

    return nextFiles;
}

function readAgentProfileFiles(params: {
    agentId: string;
    cfg?: OpenClawAgentWorkspaceConfig;
}): AgentProfileFiles {
    const workspaceDir = resolveAgentWorkspaceDir(params.agentId, params.cfg);
    const filePaths = buildAgentProfileFilePaths(workspaceDir);

    const readOrDefault = (filePath: string, fallback: string) => {
        try {
            const content = fs.readFileSync(filePath, "utf8");
            return content.trim() ? content : fallback;
        } catch {
            return fallback;
        }
    };

    return {
        identityMd: readOrDefault(filePaths.identityMd, AGENT_PROFILE_DEFAULTS.identityMd),
        soulMd: readOrDefault(filePaths.soulMd, AGENT_PROFILE_DEFAULTS.soulMd),
        userMd: readOrDefault(filePaths.userMd, AGENT_PROFILE_DEFAULTS.userMd),
        memoryMd: readOrDefault(filePaths.memoryMd, AGENT_PROFILE_DEFAULTS.memoryMd),
    };
}

export function createRealOpenClawAgent(params: {
    agentId: string;
    displayName: string;
    profileFiles?: Partial<AgentProfileFiles>;
    cfg?: OpenClawAgentWorkspaceConfig;
}): AgentDescriptor {
    // 先真实创建，再回查列表拿宿主最终状态，避免只信 add 命令的瞬时输出。
    const addOutput = runOpenClawCli([
        "agents",
        "add",
        params.agentId,
        "--workspace",
        resolveAgentWorkspaceDir(params.agentId, params.cfg),
        "--non-interactive",
        "--json",
    ]);
    const addResult = extractJsonObject(addOutput);
    const agentId = String(addResult?.agentId ?? params.agentId).trim();
    if (!agentId) {
        throw new Error("openclaw_agent_create_failed");
    }

    if (params.displayName.trim() && params.displayName.trim() !== agentId) {
        runOpenClawCli([
            "agents",
            "set-identity",
            "--agent",
            agentId,
            "--name",
            params.displayName.trim(),
            "--json",
        ]);
    }

    // 真实 Agent 创建完成后，再把 workspace 里的 profile 文件补齐。
    writeAgentProfileFiles({
        agentId,
        profileFiles: params.profileFiles,
        cfg: params.cfg,
    });

    const created = listRealOpenClawAgents().find((item) => item.id === agentId);
    return created ?? {
        id: agentId,
        name: params.displayName.trim() || agentId,
        openclawAgentRef: agentId,
    };
}

export function getRealOpenClawAgentProfile(params: {
    agentId: string;
    cfg?: OpenClawAgentWorkspaceConfig;
}): AgentProfileFiles {
    return readAgentProfileFiles(params);
}

export function updateRealOpenClawAgent(params: {
    agentId: string;
    displayName?: string;
    profileFiles?: Partial<AgentProfileFiles>;
    cfg?: OpenClawAgentWorkspaceConfig;
}): AgentDescriptor {
    const agentId = params.agentId.trim();
    if (!agentId) {
        throw new Error("openclaw_agent_update_failed");
    }

    if (params.displayName?.trim()) {
        runOpenClawCli([
            "agents",
            "set-identity",
            "--agent",
            agentId,
            "--name",
            params.displayName.trim(),
            "--json",
        ]);
    }

    writeAgentProfileFiles({
        agentId,
        profileFiles: params.profileFiles,
        cfg: params.cfg,
    });

    const updated = listRealOpenClawAgents().find((item) => item.id === agentId);
    return updated ?? {
        id: agentId,
        name: params.displayName?.trim() || agentId,
        openclawAgentRef: agentId,
    };
}
