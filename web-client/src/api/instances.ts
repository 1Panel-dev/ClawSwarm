import { apiClient } from "@/api/client";
import type {
    ConnectInstanceResponseApi,
    InstanceCredentialsReadApi,
    InstanceHealthReadApi,
    InstanceReadApi,
} from "@/types/api/instance";
import type {
    OpenClawInstanceCreateInput,
    OpenClawInstanceUpdateInput,
    OpenClawQuickConnectInput,
} from "@/types/view/openclaw";

export async function fetchInstances(): Promise<InstanceReadApi[]> {
    const response = await apiClient.get<InstanceReadApi[]>("/api/instances");
    return response.data;
}

export async function fetchInstanceHealth(): Promise<InstanceHealthReadApi[]> {
    const response = await apiClient.get<InstanceHealthReadApi[]>("/api/instances/health");
    return response.data;
}

export async function createInstance(payload: OpenClawInstanceCreateInput): Promise<InstanceReadApi> {
    const response = await apiClient.post<InstanceReadApi>("/api/instances", {
        name: payload.name,
        channel_base_url: payload.channelBaseUrl,
        channel_account_id: payload.channelAccountId,
        channel_signing_secret: payload.channelSigningSecret,
        callback_token: payload.callbackToken,
        status: payload.status,
    });
    return response.data;
}

export async function connectOpenClaw(payload: OpenClawQuickConnectInput): Promise<ConnectInstanceResponseApi> {
    const response = await apiClient.post<ConnectInstanceResponseApi>("/api/instances/connect", {
        name: payload.name,
        channel_base_url: payload.channelBaseUrl,
        channel_account_id: payload.channelAccountId,
    }, {
        timeout: 60000,
    });
    return response.data;
}

export async function fetchInstanceCredentials(instanceId: number): Promise<InstanceCredentialsReadApi> {
    const response = await apiClient.get<InstanceCredentialsReadApi>(`/api/instances/${instanceId}/credentials`);
    return response.data;
}

export async function syncOpenClawAgents(instanceId: number): Promise<{
    instance: InstanceReadApi;
    imported_agent_count: number;
    agent_keys: string[];
}> {
    const response = await apiClient.post<{
        instance: InstanceReadApi;
        imported_agent_count: number;
        agent_keys: string[];
    }>(`/api/instances/${instanceId}/sync-agents`, undefined, {
        timeout: 60000,
    });
    return response.data;
}

export async function updateOpenClawInstance(
    instanceId: number,
    payload: OpenClawInstanceUpdateInput,
): Promise<InstanceReadApi> {
    const response = await apiClient.put<InstanceReadApi>(`/api/instances/${instanceId}`, {
        name: payload.name,
        channel_base_url: payload.channelBaseUrl,
        channel_account_id: payload.channelAccountId,
    });
    return response.data;
}

export async function enableInstance(instanceId: number): Promise<InstanceReadApi> {
    const response = await apiClient.post<InstanceReadApi>(`/api/instances/${instanceId}/enable`);
    return response.data;
}

export async function disableInstance(instanceId: number): Promise<InstanceReadApi> {
    const response = await apiClient.post<InstanceReadApi>(`/api/instances/${instanceId}/disable`);
    return response.data;
}

export async function deleteInstance(instanceId: number): Promise<void> {
    await apiClient.delete(`/api/instances/${instanceId}`);
}
