export interface OpenClawAgentResponse {
    id: number;
    instance_id: number;
    agent_key: string;
    cs_id: string;
    display_name: string;
    role_name: string | null;
    enabled: boolean;
    created_via_clawswarm: boolean;
    created_at: string;
    updated_at: string;
}

export interface OpenClawAgentProfileResponse extends OpenClawAgentResponse {
    agents_md: string;
    tools_md: string;
    identity_md: string;
    soul_md: string;
    user_md: string;
    memory_md: string;
    heartbeat_md: string;
}
