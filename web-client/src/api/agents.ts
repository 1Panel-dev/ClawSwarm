import { apiClient } from "@/api/client";
import type { AgentReadApi } from "@/types/api/agent";

export async function fetchAgents(instanceId: number): Promise<AgentReadApi[]> {
    const response = await apiClient.get<AgentReadApi[]>(`/api/instances/${instanceId}/agents`);
    return response.data;
}

export async function createAgent(
    instanceId: number,
    payload: {
        agent_key: string;
        display_name: string;
        role_name?: string | null;
        enabled?: boolean;
    },
): Promise<AgentReadApi> {
    const response = await apiClient.post<AgentReadApi>(`/api/instances/${instanceId}/agents`, payload);
    return response.data;
}

export async function enableAgent(agentId: number): Promise<AgentReadApi> {
    const response = await apiClient.post<AgentReadApi>(`/api/agents/${agentId}/enable`);
    return response.data;
}

export async function disableAgent(agentId: number): Promise<AgentReadApi> {
    const response = await apiClient.post<AgentReadApi>(`/api/agents/${agentId}/disable`);
    return response.data;
}
