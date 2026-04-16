import type { AgentDialogueResponse } from "@/types/api/agent-dialogue";
import type { Camelized } from "@/utils/case";

export type AgentDialogueOutput = Camelized<AgentDialogueResponse>;

export interface AgentDialogueCreateInput {
    sourceAgentId: number;
    targetAgentId: number;
    topic: string;
    windowSeconds?: number;
    softMessageLimit?: number;
    hardMessageLimit?: number;
}

export interface AgentDialogueMessageCreateInput {
    content: string;
}
