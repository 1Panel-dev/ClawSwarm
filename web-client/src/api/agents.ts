import { apiClient } from "@/api/client";
import type { AgentProfileReadApi, AgentReadApi } from "@/types/api/agent";
import type { OpenClawAgentCreateInput, OpenClawAgentUpdateInput } from "@/types/view/openclaw";

export async function fetchAgents(instanceId: number): Promise<AgentReadApi[]> {
    const response = await apiClient.get<AgentReadApi[]>(`/api/instances/${instanceId}/agents`);
    return response.data;
}

export async function createAgent(
    instanceId: number,
    payload: OpenClawAgentCreateInput,
): Promise<AgentReadApi> {
    // Agent 创建会触发远端文件写入和同步，耗时通常长于普通接口。
    const response = await apiClient.post<AgentReadApi>(`/api/instances/${instanceId}/agents`, {
        agent_key: payload.agentKey,
        display_name: payload.displayName,
        role_name: payload.roleName,
        agents_md: payload.agentsMd,
        tools_md: payload.toolsMd,
        identity_md: payload.identityMd,
        soul_md: payload.soulMd,
        user_md: payload.userMd,
        memory_md: payload.memoryMd,
        heartbeat_md: payload.heartbeatMd,
        enabled: payload.enabled,
    }, {
        timeout: 70000,
    });
    return response.data;
}

export async function fetchAgentProfile(agentId: number): Promise<AgentProfileReadApi> {
    const response = await apiClient.get<AgentProfileReadApi>(`/api/agents/${agentId}/profile`, {
        timeout: 30000,
    });
    return response.data;
}

export async function updateAgent(
    agentId: number,
    payload: OpenClawAgentUpdateInput,
): Promise<AgentReadApi> {
    const response = await apiClient.put<AgentReadApi>(`/api/agents/${agentId}`, {
        display_name: payload.displayName,
        role_name: payload.roleName,
        agents_md: payload.agentsMd,
        tools_md: payload.toolsMd,
        identity_md: payload.identityMd,
        soul_md: payload.soulMd,
        user_md: payload.userMd,
        memory_md: payload.memoryMd,
        heartbeat_md: payload.heartbeatMd,
        enabled: payload.enabled,
    }, {
        timeout: 70000,
    });
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
