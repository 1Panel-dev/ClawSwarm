import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
    agentsMd: string;
    toolsMd: string;
    identityMd: string;
    soulMd: string;
    userMd: string;
    memoryMd: string;
    heartbeatMd: string;
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

const DEFAULT_EMPTY_TEMPLATE = "";

export const AGENT_PROFILE_DEFAULTS: AgentProfileFiles = {
    agentsMd: DEFAULT_EMPTY_TEMPLATE,
    toolsMd: DEFAULT_EMPTY_TEMPLATE,
    identityMd: DEFAULT_IDENTITY_TEMPLATE,
    soulMd: DEFAULT_SOUL_TEMPLATE,
    userMd: DEFAULT_USER_TEMPLATE,
    memoryMd: DEFAULT_MEMORY_TEMPLATE,
    heartbeatMd: DEFAULT_EMPTY_TEMPLATE,
};

const AGENT_PROFILE_FILENAMES = {
    agentsMd: "AGENTS.md",
    toolsMd: "TOOLS.md",
    identityMd: "IDENTITY.md",
    soulMd: "SOUL.md",
    userMd: "USER.md",
    memoryMd: "MEMORY.md",
    heartbeatMd: "HEARTBEAT.md",
} as const;

function resolveUserPath(rawPath: string): string {
    if (!rawPath) return rawPath;
    if (rawPath === "~") return os.homedir();
    if (rawPath.startsWith("~/")) {
        return path.join(os.homedir(), rawPath.slice(2));
    }
    return rawPath;
}

function normalizeAgentId(agentId: string): string {
    return agentId.trim().toLowerCase();
}

export function resolveAgentWorkspaceDir(agentId: string, cfg?: OpenClawAgentWorkspaceConfig): string {
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
        agentsMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.agentsMd),
        toolsMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.toolsMd),
        identityMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.identityMd),
        soulMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.soulMd),
        userMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.userMd),
        memoryMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.memoryMd),
        heartbeatMd: path.join(workspaceDir, AGENT_PROFILE_FILENAMES.heartbeatMd),
    };
}

function withDefaultProfileFiles(partial?: Partial<AgentProfileFiles>): AgentProfileFiles {
    return {
        agentsMd: partial?.agentsMd !== undefined ? partial.agentsMd : AGENT_PROFILE_DEFAULTS.agentsMd,
        toolsMd: partial?.toolsMd !== undefined ? partial.toolsMd : AGENT_PROFILE_DEFAULTS.toolsMd,
        identityMd: partial?.identityMd?.trim() ? partial.identityMd : AGENT_PROFILE_DEFAULTS.identityMd,
        soulMd: partial?.soulMd?.trim() ? partial.soulMd : AGENT_PROFILE_DEFAULTS.soulMd,
        userMd: partial?.userMd?.trim() ? partial.userMd : AGENT_PROFILE_DEFAULTS.userMd,
        memoryMd: partial?.memoryMd?.trim() ? partial.memoryMd : AGENT_PROFILE_DEFAULTS.memoryMd,
        heartbeatMd: partial?.heartbeatMd !== undefined ? partial.heartbeatMd : AGENT_PROFILE_DEFAULTS.heartbeatMd,
    };
}

function mergeProfileFiles(base: AgentProfileFiles, partial?: Partial<AgentProfileFiles>): AgentProfileFiles {
    return {
        agentsMd: partial?.agentsMd !== undefined ? partial.agentsMd : base.agentsMd,
        toolsMd: partial?.toolsMd !== undefined ? partial.toolsMd : base.toolsMd,
        identityMd: partial?.identityMd !== undefined ? partial.identityMd : base.identityMd,
        soulMd: partial?.soulMd !== undefined ? partial.soulMd : base.soulMd,
        userMd: partial?.userMd !== undefined ? partial.userMd : base.userMd,
        memoryMd: partial?.memoryMd !== undefined ? partial.memoryMd : base.memoryMd,
        heartbeatMd: partial?.heartbeatMd !== undefined ? partial.heartbeatMd : base.heartbeatMd,
    };
}

export function writeAgentProfileFiles(params: {
    agentId: string;
    profileFiles?: Partial<AgentProfileFiles>;
    baseFiles?: AgentProfileFiles;
    cfg?: OpenClawAgentWorkspaceConfig;
}): AgentProfileFiles {
    const workspaceDir = resolveAgentWorkspaceDir(params.agentId, params.cfg);
    ensureWorkspaceDir(workspaceDir);
    const filePaths = buildAgentProfileFilePaths(workspaceDir);
    const nextFiles = params.baseFiles
        ? mergeProfileFiles(params.baseFiles, params.profileFiles)
        : withDefaultProfileFiles(params.profileFiles);

    // 这里始终写成完整文件，避免出现空文件或部分字段缺失导致的行为漂移。
    fs.writeFileSync(filePaths.agentsMd, nextFiles.agentsMd, "utf8");
    fs.writeFileSync(filePaths.toolsMd, nextFiles.toolsMd, "utf8");
    fs.writeFileSync(filePaths.identityMd, nextFiles.identityMd, "utf8");
    fs.writeFileSync(filePaths.soulMd, nextFiles.soulMd, "utf8");
    fs.writeFileSync(filePaths.userMd, nextFiles.userMd, "utf8");
    fs.writeFileSync(filePaths.memoryMd, nextFiles.memoryMd, "utf8");
    fs.writeFileSync(filePaths.heartbeatMd, nextFiles.heartbeatMd, "utf8");

    return nextFiles;
}

export function readAgentProfileFiles(params: {
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
        agentsMd: readOrDefault(filePaths.agentsMd, AGENT_PROFILE_DEFAULTS.agentsMd),
        toolsMd: readOrDefault(filePaths.toolsMd, AGENT_PROFILE_DEFAULTS.toolsMd),
        identityMd: readOrDefault(filePaths.identityMd, AGENT_PROFILE_DEFAULTS.identityMd),
        soulMd: readOrDefault(filePaths.soulMd, AGENT_PROFILE_DEFAULTS.soulMd),
        userMd: readOrDefault(filePaths.userMd, AGENT_PROFILE_DEFAULTS.userMd),
        memoryMd: readOrDefault(filePaths.memoryMd, AGENT_PROFILE_DEFAULTS.memoryMd),
        heartbeatMd: readOrDefault(filePaths.heartbeatMd, AGENT_PROFILE_DEFAULTS.heartbeatMd),
    };
}
