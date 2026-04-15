import { apiClient } from "@/api/client";
import { snakeizeKeys } from "@/utils/case";
import type {
    OpenClawConnectResponse,
    OpenClawInstanceCredentialsResponse,
    OpenClawInstanceHealthResponse,
    OpenClawInstanceResponse,
    OpenClawSyncAgentsResponse,
} from "@/types/api/instance";
import type {
    OpenClawInstanceCreateInput,
    OpenClawInstanceUpdateInput,
    OpenClawQuickConnectInput,
} from "@/types/view/openclaw";

export async function fetchInstances(): Promise<OpenClawInstanceResponse[]> {
    const response = await apiClient.get<OpenClawInstanceResponse[]>("/api/instances");
    return response.data;
}

export async function fetchInstanceHealth(): Promise<OpenClawInstanceHealthResponse[]> {
    const response = await apiClient.get<OpenClawInstanceHealthResponse[]>("/api/instances/health");
    return response.data;
}

export async function createInstance(payload: OpenClawInstanceCreateInput): Promise<OpenClawInstanceResponse> {
    const response = await apiClient.post<OpenClawInstanceResponse>("/api/instances", snakeizeKeys(payload));
    return response.data;
}

export async function connectOpenClaw(payload: OpenClawQuickConnectInput): Promise<OpenClawConnectResponse> {
    const response = await apiClient.post<OpenClawConnectResponse>("/api/instances/connect", snakeizeKeys(payload), {
        timeout: 60000,
    });
    return response.data;
}

export async function fetchInstanceCredentials(instanceId: number): Promise<OpenClawInstanceCredentialsResponse> {
    const response = await apiClient.get<OpenClawInstanceCredentialsResponse>(`/api/instances/${instanceId}/credentials`);
    return response.data;
}

export async function syncOpenClawAgents(instanceId: number): Promise<OpenClawSyncAgentsResponse> {
    const response = await apiClient.post<OpenClawSyncAgentsResponse>(`/api/instances/${instanceId}/sync-agents`, undefined, {
        timeout: 60000,
    });
    return response.data;
}

export async function updateOpenClawInstance(
    instanceId: number,
    payload: OpenClawInstanceUpdateInput,
): Promise<OpenClawInstanceResponse> {
    const response = await apiClient.put<OpenClawInstanceResponse>(`/api/instances/${instanceId}`, snakeizeKeys(payload));
    return response.data;
}

export async function enableInstance(instanceId: number): Promise<OpenClawInstanceResponse> {
    const response = await apiClient.post<OpenClawInstanceResponse>(`/api/instances/${instanceId}/enable`);
    return response.data;
}

export async function disableInstance(instanceId: number): Promise<OpenClawInstanceResponse> {
    const response = await apiClient.post<OpenClawInstanceResponse>(`/api/instances/${instanceId}/disable`);
    return response.data;
}

export async function deleteInstance(instanceId: number): Promise<void> {
    await apiClient.delete(`/api/instances/${instanceId}`);
}
