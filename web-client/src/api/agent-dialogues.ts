import { apiClient } from "@/api/client";
import type {
    AgentDialogueResponse,
} from "@/types/api/agent-dialogue";
import type { AgentDialogueCreateInput, AgentDialogueMessageCreateInput, AgentDialogueOutput } from "@/types/view/agent-dialogue";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";

export async function createAgentDialogue(payload: AgentDialogueCreateInput): Promise<AgentDialogueOutput> {
    const response = await apiClient.post<AgentDialogueResponse>("/api/agent-dialogues", snakeizeKeys(payload));
    return camelizeKeys(response.data);
}

export async function fetchAgentDialogue(dialogueId: number): Promise<AgentDialogueOutput> {
    const response = await apiClient.get<AgentDialogueResponse>(`/api/agent-dialogues/${dialogueId}`);
    return camelizeKeys(response.data);
}

export async function pauseAgentDialogue(dialogueId: number): Promise<AgentDialogueOutput> {
    const response = await apiClient.post<AgentDialogueResponse>(`/api/agent-dialogues/${dialogueId}/pause`);
    return camelizeKeys(response.data);
}

export async function resumeAgentDialogue(dialogueId: number): Promise<AgentDialogueOutput> {
    const response = await apiClient.post<AgentDialogueResponse>(`/api/agent-dialogues/${dialogueId}/resume`);
    return camelizeKeys(response.data);
}

export async function stopAgentDialogue(dialogueId: number): Promise<AgentDialogueOutput> {
    const response = await apiClient.post<AgentDialogueResponse>(`/api/agent-dialogues/${dialogueId}/stop`);
    return camelizeKeys(response.data);
}

export async function sendAgentDialogueMessage(
    dialogueId: number,
    payload: AgentDialogueMessageCreateInput,
): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
        `/api/agent-dialogues/${dialogueId}/messages`,
        snakeizeKeys(payload),
    );
    return response.data;
}
