/**
 * 群组模块的前端输入输出模型。
 */
import type { GroupDetailResponse, GroupMemberResponse, GroupResponse } from "@/types/api/group";
import type { Camelized } from "@/utils/case";

export type GroupOutput = Camelized<GroupResponse>;

export type GroupMemberOutput = Camelized<GroupMemberResponse>;

export type GroupDetailOutput = Camelized<GroupDetailResponse>;

export interface GroupMemberInput {
    instanceId: number;
    agentId: number;
}

export interface GroupCreateInput {
    name: string;
    description?: string | null;
    members?: GroupMemberInput[];
}
