export interface AgentReadApi {
    id: number;
    instance_id: number;
    agent_key: string;
    display_name: string;
    role_name: string | null;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}
