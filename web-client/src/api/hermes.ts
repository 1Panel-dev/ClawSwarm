import { apiClient } from "@/api/client";
import type {
    HermesConnectionTestResponse,
    HermesInstanceResponse,
    HermesProfileResponse,
} from "@/types/api/hermes";
import type {
    HermesConnectionTestOutput,
    HermesInstanceInput,
    HermesInstanceOutput,
    HermesProfileInput,
    HermesProfileOutput,
} from "@/types/view/hermes";
import type { ConversationResponse } from "@/types/api/conversation";
import type { ConversationOutput } from "@/types/view/conversation";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";

export async function fetchHermesInstances(): Promise<HermesInstanceOutput[]> {
    const response = await apiClient.get<HermesInstanceResponse[]>("/api/hermes/instances");
    return response.data.map((item) => ({...camelizeKeys(item), profiles: []}));
}

export async function createHermesInstance(payload: HermesInstanceInput): Promise<HermesInstanceOutput> {
    const response = await apiClient.post<HermesInstanceResponse>("/api/hermes/instances", snakeizeKeys(payload));
    return {...camelizeKeys(response.data), profiles: []};
}

export async function updateHermesInstance(instanceId: number, payload: HermesInstanceInput): Promise<HermesInstanceOutput> {
    const response = await apiClient.put<HermesInstanceResponse>(`/api/hermes/instances/${instanceId}`, snakeizeKeys(payload));
    return {...camelizeKeys(response.data), profiles: []};
}

export async function deleteHermesInstance(instanceId: number): Promise<void> {
    await apiClient.delete(`/api/hermes/instances/${instanceId}`);
}

export async function enableHermesInstance(instanceId: number): Promise<HermesInstanceOutput> {
    const response = await apiClient.post<HermesInstanceResponse>(`/api/hermes/instances/${instanceId}/enable`);
    return {...camelizeKeys(response.data), profiles: []};
}

export async function disableHermesInstance(instanceId: number): Promise<HermesInstanceOutput> {
    const response = await apiClient.post<HermesInstanceResponse>(`/api/hermes/instances/${instanceId}/disable`);
    return {...camelizeKeys(response.data), profiles: []};
}

export async function testHermesInstance(instanceId: number): Promise<HermesConnectionTestOutput> {
    const response = await apiClient.post<HermesConnectionTestResponse>(`/api/hermes/instances/${instanceId}/test`, undefined, {
        timeout: 30000,
    });
    return camelizeKeys(response.data);
}

export async function fetchHermesProfiles(instanceId: number): Promise<HermesProfileOutput[]> {
    const response = await apiClient.get<HermesProfileResponse[]>(`/api/hermes/instances/${instanceId}/profiles`);
    return response.data.map(camelizeKeys);
}

export async function createHermesProfile(instanceId: number, payload: HermesProfileInput): Promise<HermesProfileOutput> {
    const response = await apiClient.post<HermesProfileResponse>(
        `/api/hermes/instances/${instanceId}/profiles`,
        snakeizeKeys(payload),
    );
    return camelizeKeys(response.data);
}

export async function updateHermesProfile(profileId: number, payload: HermesProfileInput): Promise<HermesProfileOutput> {
    const response = await apiClient.put<HermesProfileResponse>(`/api/hermes/profiles/${profileId}`, snakeizeKeys(payload));
    return camelizeKeys(response.data);
}

export async function deleteHermesProfile(profileId: number): Promise<void> {
    await apiClient.delete(`/api/hermes/profiles/${profileId}`);
}

export async function enableHermesProfile(profileId: number): Promise<HermesProfileOutput> {
    const response = await apiClient.post<HermesProfileResponse>(`/api/hermes/profiles/${profileId}/enable`);
    return camelizeKeys(response.data);
}

export async function disableHermesProfile(profileId: number): Promise<HermesProfileOutput> {
    const response = await apiClient.post<HermesProfileResponse>(`/api/hermes/profiles/${profileId}/disable`);
    return camelizeKeys(response.data);
}

export async function openHermesProfileConversation(profileId: number): Promise<ConversationOutput> {
    const response = await apiClient.post<ConversationResponse>(`/api/hermes/profiles/${profileId}/conversation`);
    return camelizeKeys(response.data);
}
