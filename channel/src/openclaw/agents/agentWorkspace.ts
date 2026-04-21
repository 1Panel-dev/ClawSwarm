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

export type LegacyAgentProfileFiles = {
    agentsMd: string;
    toolsMd: string;
    identityMd: string;
    soulMd: string;
    userMd: string;
    memoryMd: string;
    heartbeatMd: string;
};

export type AgentWorkspaceFile = {
    name: string;
    content: string;
};

export type AgentWorkspaceFileInput = {
    name: string;
    content?: string | null;
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

export const AGENT_PROFILE_DEFAULTS: LegacyAgentProfileFiles = {
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

const ORDERED_KNOWN_PROFILE_FILES: readonly string[] = Object.values(AGENT_PROFILE_FILENAMES);

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

function normalizeWorkspaceFileName(name: string): string {
    return name.trim();
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

export function filesFromLegacyProfileFiles(partial?: Partial<LegacyAgentProfileFiles>): AgentWorkspaceFileInput[] {
    if (!partial) {
        return [];
    }
    const files: AgentWorkspaceFileInput[] = [];
    if (partial.agentsMd !== undefined) files.push({ name: AGENT_PROFILE_FILENAMES.agentsMd, content: partial.agentsMd });
    if (partial.toolsMd !== undefined) files.push({ name: AGENT_PROFILE_FILENAMES.toolsMd, content: partial.toolsMd });
    if (partial.identityMd !== undefined) files.push({ name: AGENT_PROFILE_FILENAMES.identityMd, content: partial.identityMd });
    if (partial.soulMd !== undefined) files.push({ name: AGENT_PROFILE_FILENAMES.soulMd, content: partial.soulMd });
    if (partial.userMd !== undefined) files.push({ name: AGENT_PROFILE_FILENAMES.userMd, content: partial.userMd });
    if (partial.memoryMd !== undefined) files.push({ name: AGENT_PROFILE_FILENAMES.memoryMd, content: partial.memoryMd });
    if (partial.heartbeatMd !== undefined) files.push({ name: AGENT_PROFILE_FILENAMES.heartbeatMd, content: partial.heartbeatMd });
    return files;
}

function workspaceFilesToMap(files?: AgentWorkspaceFileInput[]): Map<string, string> {
    const mapped = new Map<string, string>();
    for (const file of files ?? []) {
        const normalizedName = normalizeWorkspaceFileName(String(file?.name ?? ""));
        if (!normalizedName) {
            continue;
        }
        mapped.set(normalizedName, String(file.content ?? ""));
    }
    return mapped;
}

function withDefaultWorkspaceFiles(files?: AgentWorkspaceFileInput[]): AgentWorkspaceFile[] {
    const merged = workspaceFilesToMap(files);
    for (const [key, filename] of Object.entries(AGENT_PROFILE_FILENAMES)) {
        if (merged.has(filename)) {
            continue;
        }
        const fallback = AGENT_PROFILE_DEFAULTS[key as keyof LegacyAgentProfileFiles];
        merged.set(filename, fallback);
    }
    return sortWorkspaceFiles(
        Array.from(merged.entries()).map(([name, content]) => ({ name, content })),
    );
}

function mergeWorkspaceFiles(baseFiles: AgentWorkspaceFile[], partialFiles?: AgentWorkspaceFileInput[]): AgentWorkspaceFile[] {
    const merged = workspaceFilesToMap(baseFiles);
    for (const [name, content] of workspaceFilesToMap(partialFiles)) {
        merged.set(name, content);
    }
    return sortWorkspaceFiles(
        Array.from(merged.entries()).map(([name, content]) => ({ name, content })),
    );
}

function sortWorkspaceFiles(files: AgentWorkspaceFile[]): AgentWorkspaceFile[] {
    return [...files].sort((left, right) => {
        const leftIndex = ORDERED_KNOWN_PROFILE_FILES.indexOf(left.name);
        const rightIndex = ORDERED_KNOWN_PROFILE_FILES.indexOf(right.name);
        if (leftIndex !== -1 || rightIndex !== -1) {
            if (leftIndex === -1) return 1;
            if (rightIndex === -1) return -1;
            return leftIndex - rightIndex;
        }
        return left.name.localeCompare(right.name);
    });
}

export function legacyProfileFilesFromWorkspaceFiles(files: AgentWorkspaceFile[]): LegacyAgentProfileFiles {
    const mapped = workspaceFilesToMap(files);
    return {
        agentsMd: mapped.get(AGENT_PROFILE_FILENAMES.agentsMd) ?? AGENT_PROFILE_DEFAULTS.agentsMd,
        toolsMd: mapped.get(AGENT_PROFILE_FILENAMES.toolsMd) ?? AGENT_PROFILE_DEFAULTS.toolsMd,
        identityMd: mapped.get(AGENT_PROFILE_FILENAMES.identityMd) ?? AGENT_PROFILE_DEFAULTS.identityMd,
        soulMd: mapped.get(AGENT_PROFILE_FILENAMES.soulMd) ?? AGENT_PROFILE_DEFAULTS.soulMd,
        userMd: mapped.get(AGENT_PROFILE_FILENAMES.userMd) ?? AGENT_PROFILE_DEFAULTS.userMd,
        memoryMd: mapped.get(AGENT_PROFILE_FILENAMES.memoryMd) ?? AGENT_PROFILE_DEFAULTS.memoryMd,
        heartbeatMd: mapped.get(AGENT_PROFILE_FILENAMES.heartbeatMd) ?? AGENT_PROFILE_DEFAULTS.heartbeatMd,
    };
}

export interface WriteAgentProfileFilesParams {
    agentId: string;
    files?: AgentWorkspaceFileInput[];
    profileFiles?: Partial<LegacyAgentProfileFiles>;
    baseFiles?: AgentWorkspaceFile[];
    cfg?: OpenClawAgentWorkspaceConfig;
}

export interface ReadAgentProfileFilesParams {
    agentId: string;
    cfg?: OpenClawAgentWorkspaceConfig;
}

export function writeAgentProfileFiles(params: WriteAgentProfileFilesParams): AgentWorkspaceFile[] {
    const workspaceDir = resolveAgentWorkspaceDir(params.agentId, params.cfg);
    ensureWorkspaceDir(workspaceDir);
    const nextFilesInput = [
        ...filesFromLegacyProfileFiles(params.profileFiles),
        ...(params.files ?? []),
    ];
    const nextFiles = params.baseFiles
        ? mergeWorkspaceFiles(params.baseFiles, nextFilesInput)
        : withDefaultWorkspaceFiles(nextFilesInput);

    for (const file of nextFiles) {
        const filePath = path.join(workspaceDir, file.name);
        fs.writeFileSync(filePath, file.content, "utf8");
    }

    return nextFiles;
}

export function readAgentProfileFiles(params: ReadAgentProfileFilesParams): AgentWorkspaceFile[] {
    const workspaceDir = resolveAgentWorkspaceDir(params.agentId, params.cfg);
    const existingFiles: AgentWorkspaceFile[] = [];

    try {
        for (const entry of fs.readdirSync(workspaceDir, { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.endsWith(".md")) {
                continue;
            }
            const filePath = path.join(workspaceDir, entry.name);
            const content = fs.readFileSync(filePath, "utf8");
            existingFiles.push({
                name: entry.name,
                content: content.trim() ? content : "",
            });
        }
    } catch {
        return withDefaultWorkspaceFiles();
    }

    return withDefaultWorkspaceFiles(existingFiles);
}
