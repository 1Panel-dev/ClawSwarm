import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execFileSyncMock } = vi.hoisted(() => ({
    execFileSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
    execFileSync: execFileSyncMock,
}));

import { getRealOpenClawAgentProfile, updateRealOpenClawAgent } from "../openclaw/manageAgents.js";

describe("updateRealOpenClawAgent", () => {
    let workspaceDir: string;

    beforeEach(() => {
        workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "claw-team-agent-"));
        execFileSyncMock.mockReset();
        execFileSyncMock.mockReturnValue(
            JSON.stringify([
                {
                    id: "execution-engineer2",
                    name: "执行工程师 2",
                },
            ]),
        );
    });

    afterEach(() => {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
    });

    it("keeps untouched files when updating only one profile file", () => {
        fs.writeFileSync(path.join(workspaceDir, "IDENTITY.md"), "# IDENTITY.md\n\nidentity original\n", "utf8");
        fs.writeFileSync(path.join(workspaceDir, "SOUL.md"), "# SOUL.md\n\nsoul original\n", "utf8");
        fs.writeFileSync(path.join(workspaceDir, "USER.md"), "# USER.md\n\nuser original\n", "utf8");
        fs.writeFileSync(path.join(workspaceDir, "MEMORY.md"), "# MEMORY.md\n\nmemory original\n", "utf8");

        updateRealOpenClawAgent({
            agentId: "execution-engineer2",
            profileFiles: {
                memoryMd: "# MEMORY.md\n\nmemory updated\n",
            },
            cfg: {
                agents: {
                    list: [
                        {
                            id: "execution-engineer2",
                            workspace: workspaceDir,
                        },
                    ],
                },
            },
        });

        expect(
            getRealOpenClawAgentProfile({
                agentId: "execution-engineer2",
                cfg: {
                    agents: {
                        list: [
                            {
                                id: "execution-engineer2",
                                workspace: workspaceDir,
                            },
                        ],
                    },
                },
            }),
        ).toEqual({
            identityMd: "# IDENTITY.md\n\nidentity original\n",
            soulMd: "# SOUL.md\n\nsoul original\n",
            userMd: "# USER.md\n\nuser original\n",
            memoryMd: "# MEMORY.md\n\nmemory updated\n",
        });
    });
});
