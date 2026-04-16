/**
 * 通讯录接口的原始响应类型。
 *
 * 这一层保持与后端字段一致。
 */
export interface AddressBookAgentResponse {
    id: number;
    agent_key: string;
    cs_id: string;
    display_name: string;
    role_name: string | null;
    enabled: boolean;
}

export interface AddressBookInstanceResponse {
    id: number;
    name: string;
    status: string;
    agents: AddressBookAgentResponse[];
}

export interface AddressBookGroupMemberResponse {
    id: number;
    instance_id: number;
    agent_id: number;
    display_name: string;
    agent_key: string;
    instance_name: string;
}

export interface AddressBookGroupResponse {
    id: number;
    name: string;
    description: string | null;
    members: AddressBookGroupMemberResponse[];
}

export interface AddressBookResponse {
    instances: AddressBookInstanceResponse[];
    groups: AddressBookGroupResponse[];
}
