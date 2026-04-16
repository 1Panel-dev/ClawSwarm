import { apiClient } from "@/api/client";
import type {
    OpenClawConnectResponse,
    OpenClawInstanceCredentialsResponse,
    OpenClawInstanceHealthResponse,
    OpenClawInstanceResponse,
    OpenClawSyncAgentsResponse,
} from "@/types/api/instance";
import type {
    OpenClawConnectResultOutput,
    OpenClawInstanceCreateInput,
    OpenClawInstanceCredentialsOutput,
    OpenClawInstanceOutput,
    OpenClawInstanceUpdateInput,
    OpenClawQuickConnectInput,
    OpenClawSyncAgentsOutput,
} from "@/types/view/openclaw";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";
import { toOpenClawConnectResultOutput, toOpenClawInstanceOutput } from "@/stores/openclawMappers";

export async function fetchInstances(): Promise<OpenClawInstanceOutput[]> {
    const response = await apiClient.get<OpenClawInstanceResponse[]>("/api/instances");
    return response.data.map((item) => toOpenClawInstanceOutput(item, []));
}

export async function fetchInstanceHealth(): Promise<OpenClawInstanceHealthResponse[]> {
    const response = await apiClient.get<OpenClawInstanceHealthResponse[]>("/api/instances/health");
    return response.data;
}

export async function createInstance(payload: OpenClawInstanceCreateInput): Promise<OpenClawInstanceOutput> {
    const response = await apiClient.post<OpenClawInstanceResponse>("/api/instances", snakeizeKeys(payload));
    return toOpenClawInstanceOutput(response.data, []);
}

export async function connectOpenClaw(payload: OpenClawQuickConnectInput): Promise<OpenClawConnectResultOutput> {
    const response = await apiClient.post<OpenClawConnectResponse>("/api/instances/connect", snakeizeKeys(payload), {
        timeout: 60000,
    });
    return toOpenClawConnectResultOutput(response.data, []);
}

export async function fetchInstanceCredentials(instanceId: number): Promise<OpenClawInstanceCredentialsOutput> {
    const response = await apiClient.get<OpenClawInstanceCredentialsResponse>(`/api/instances/${instanceId}/credentials`);
    return camelizeKeys(response.data);
}

export async function syncOpenClawAgents(instanceId: number): Promise<OpenClawSyncAgentsOutput> {
    const response = await apiClient.post<OpenClawSyncAgentsResponse>(`/api/instances/${instanceId}/sync-agents`, undefined, {
        timeout: 60000,
    });
    return camelizeKeys(response.data);
}

export async function updateOpenClawInstance(
    instanceId: number,
    payload: OpenClawInstanceUpdateInput,
): Promise<OpenClawInstanceOutput> {
    const response = await apiClient.put<OpenClawInstanceResponse>(`/api/instances/${instanceId}`, snakeizeKeys(payload));
    return toOpenClawInstanceOutput(response.data, []);
}

export async function enableInstance(instanceId: number): Promise<OpenClawInstanceOutput> {
    const response = await apiClient.post<OpenClawInstanceResponse>(`/api/instances/${instanceId}/enable`);
    return toOpenClawInstanceOutput(response.data, []);
}

export async function disableInstance(instanceId: number): Promise<OpenClawInstanceOutput> {
    const response = await apiClient.post<OpenClawInstanceResponse>(`/api/instances/${instanceId}/disable`);
    return toOpenClawInstanceOutput(response.data, []);
}

export async function deleteInstance(instanceId: number): Promise<void> {
    await apiClient.delete(`/api/instances/${instanceId}`);
}
