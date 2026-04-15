import { apiClient } from "@/api/client";
import { snakeizeKeys } from "@/utils/case";
import type { OpenClawAgentProfileResponse, OpenClawAgentResponse } from "@/types/api/agent";
import type { OpenClawAgentCreateInput, OpenClawAgentUpdateInput } from "@/types/view/openclaw";

export async function fetchAgents(instanceId: number): Promise<OpenClawAgentResponse[]> {
    const response = await apiClient.get<OpenClawAgentResponse[]>(`/api/instances/${instanceId}/agents`);
    return response.data;
}

export async function createAgent(
    instanceId: number,
    payload: OpenClawAgentCreateInput,
): Promise<OpenClawAgentResponse> {
    // Agent 创建会触发远端文件写入和同步，耗时通常长于普通接口。
    const response = await apiClient.post<OpenClawAgentResponse>(
        `/api/instances/${instanceId}/agents`,
        snakeizeKeys(payload),
        {
        timeout: 70000,
        },
    );
    return response.data;
}

export async function fetchAgentProfile(agentId: number): Promise<OpenClawAgentProfileResponse> {
    const response = await apiClient.get<OpenClawAgentProfileResponse>(`/api/agents/${agentId}/profile`, {
        timeout: 30000,
    });
    return response.data;
}

export async function updateAgent(
    agentId: number,
    payload: OpenClawAgentUpdateInput,
): Promise<OpenClawAgentResponse> {
    const response = await apiClient.put<OpenClawAgentResponse>(`/api/agents/${agentId}`, snakeizeKeys(payload), {
        timeout: 70000,
    });
    return response.data;
}

export async function enableAgent(agentId: number): Promise<OpenClawAgentResponse> {
    const response = await apiClient.post<OpenClawAgentResponse>(`/api/agents/${agentId}/enable`);
    return response.data;
}

export async function disableAgent(agentId: number): Promise<OpenClawAgentResponse> {
    const response = await apiClient.post<OpenClawAgentResponse>(`/api/agents/${agentId}/disable`);
    return response.data;
}
