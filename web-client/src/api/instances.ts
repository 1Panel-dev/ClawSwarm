import { apiClient } from "@/api/client";
import type { InstanceReadApi } from "@/types/api/instance";

export async function fetchInstances(): Promise<InstanceReadApi[]> {
    const response = await apiClient.get<InstanceReadApi[]>("/api/instances");
    return response.data;
}

export async function createInstance(payload: {
    name: string;
    channel_base_url: string;
    channel_account_id: string;
    channel_signing_secret: string;
    callback_token: string;
    status?: string;
}): Promise<InstanceReadApi> {
    const response = await apiClient.post<InstanceReadApi>("/api/instances", payload);
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
