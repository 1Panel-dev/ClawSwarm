import { apiClient } from "@/api/client";
import type { OpenClawAgentProfileResponse, OpenClawAgentResponse } from "@/types/api/agent";
import type {
    OpenClawAgentCreateInput,
    OpenClawAgentOutput,
    OpenClawAgentProfileOutput,
    OpenClawAgentUpdateInput,
} from "@/types/view/openclaw";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";

export async function fetchAgents(instanceId: number): Promise<OpenClawAgentOutput[]> {
    const response = await apiClient.get<OpenClawAgentResponse[]>(`/api/instances/${instanceId}/agents`);
    return response.data.map(camelizeKeys);
}

export async function createAgent(
    instanceId: number,
    payload: OpenClawAgentCreateInput,
): Promise<OpenClawAgentOutput> {
    // Agent 创建会触发远端文件写入和同步，耗时通常长于普通接口。
    const response = await apiClient.post<OpenClawAgentResponse>(
        `/api/instances/${instanceId}/agents`,
        snakeizeKeys(payload),
        {
        timeout: 70000,
        },
    );
    return camelizeKeys(response.data);
}

export async function fetchAgentProfile(agentId: number): Promise<OpenClawAgentProfileOutput> {
    const response = await apiClient.get<OpenClawAgentProfileResponse>(`/api/agents/${agentId}/profile`, {
        timeout: 30000,
    });
    return camelizeKeys(response.data);
}

export async function updateAgent(
    agentId: number,
    payload: OpenClawAgentUpdateInput,
): Promise<OpenClawAgentOutput> {
    const response = await apiClient.put<OpenClawAgentResponse>(`/api/agents/${agentId}`, snakeizeKeys(payload), {
        timeout: 70000,
    });
    return camelizeKeys(response.data);
}

export async function enableAgent(agentId: number): Promise<OpenClawAgentOutput> {
    const response = await apiClient.post<OpenClawAgentResponse>(`/api/agents/${agentId}/enable`);
    return camelizeKeys(response.data);
}

export async function disableAgent(agentId: number): Promise<OpenClawAgentOutput> {
    const response = await apiClient.post<OpenClawAgentResponse>(`/api/agents/${agentId}/disable`);
    return camelizeKeys(response.data);
}
