import { apiClient } from "@/api/client";
import type { GroupDetailResponse, GroupResponse } from "@/types/api/group";
import type { GroupCreateInput, GroupDetailOutput, GroupMemberInput, GroupOutput } from "@/types/view/group";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";

export async function fetchGroups(): Promise<GroupOutput[]> {
    const response = await apiClient.get<GroupResponse[]>("/api/groups");
    return camelizeKeys(response.data);
}

export async function fetchGroupDetail(groupId: number): Promise<GroupDetailOutput> {
    const response = await apiClient.get<GroupDetailResponse>(`/api/groups/${groupId}`);
    return camelizeKeys(response.data);
}

export async function createGroup(payload: GroupCreateInput): Promise<GroupOutput> {
    const response = await apiClient.post<GroupResponse>("/api/groups", snakeizeKeys(payload));
    return camelizeKeys(response.data);
}

export async function addGroupMembers(
    groupId: number,
    members: GroupMemberInput[],
) {
    const response = await apiClient.post(`/api/groups/${groupId}/members`, {
        members: snakeizeKeys(members),
    });
    return response.data;
}

export async function deleteGroupMember(groupId: number, memberId: number): Promise<GroupDetailOutput> {
    const response = await apiClient.delete<GroupDetailResponse>(`/api/groups/${groupId}/members/${memberId}`);
    return camelizeKeys(response.data);
}

export async function deleteGroup(groupId: number): Promise<void> {
    await apiClient.post(`/api/groups/${groupId}/delete`);
}
