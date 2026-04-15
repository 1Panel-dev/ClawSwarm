import projectManagerIdentity from "@/agent-templates/project-manager/IDENTITY.md?raw";
import projectManagerSoul from "@/agent-templates/project-manager/SOUL.md?raw";
import projectManagerUser from "@/agent-templates/project-manager/USER.md?raw";
import projectManagerMemory from "@/agent-templates/project-manager/MEMORY.md?raw";
import executionEngineerIdentity from "@/agent-templates/execution-engineer/IDENTITY.md?raw";
import executionEngineerSoul from "@/agent-templates/execution-engineer/SOUL.md?raw";
import executionEngineerUser from "@/agent-templates/execution-engineer/USER.md?raw";
import executionEngineerMemory from "@/agent-templates/execution-engineer/MEMORY.md?raw";

export type AgentTemplateDefinition = {
    key: string;
    labelKey: string;
    agentKey: string;
    displayName: string;
    roleName: string;
    agentsMd: string;
    toolsMd: string;
    identityMd: string;
    soulMd: string;
    userMd: string;
    memoryMd: string;
    heartbeatMd: string;
};

export const AGENT_TEMPLATES: AgentTemplateDefinition[] = [
    {
        key: "blank",
        labelKey: "openclaw.agentTemplateBlank",
        agentKey: "",
        displayName: "",
        roleName: "",
        agentsMd: "",
        toolsMd: "",
        identityMd: "",
        soulMd: "",
        userMd: "",
        memoryMd: "",
        heartbeatMd: "",
    },
    {
        key: "project-manager",
        labelKey: "openclaw.agentTemplateProjectManager",
        agentKey: "project-manager",
        displayName: "项目经理",
        roleName: "项目经理",
        agentsMd: "",
        toolsMd: "",
        identityMd: projectManagerIdentity,
        soulMd: projectManagerSoul,
        userMd: projectManagerUser,
        memoryMd: projectManagerMemory,
        heartbeatMd: "",
    },
    {
        key: "execution-engineer",
        labelKey: "openclaw.agentTemplateExecutionEngineer",
        agentKey: "execution-engineer",
        displayName: "执行工程师",
        roleName: "执行工程师",
        agentsMd: "",
        toolsMd: "",
        identityMd: executionEngineerIdentity,
        soulMd: executionEngineerSoul,
        userMd: executionEngineerUser,
        memoryMd: executionEngineerMemory,
        heartbeatMd: "",
    },
];
