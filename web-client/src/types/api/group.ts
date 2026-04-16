export interface GroupResponse {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface GroupMemberResponse {
    id: number;
    group_id: number;
    instance_id: number;
    agent_id: number;
    joined_at: string;
    agent_key: string;
    display_name: string;
    role_name: string | null;
    instance_name: string;
}

export interface GroupDetailResponse {
    id: number;
    name: string;
    description: string | null;
    members: GroupMemberResponse[];
}
