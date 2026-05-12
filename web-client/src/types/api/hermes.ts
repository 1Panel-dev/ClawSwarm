export interface HermesInstanceResponse {
    id: number;
    instance_key: string;
    runtime_target_id: number;
    cs_id: string;
    name: string;
    display_name: string;
    role_name: string | null;
    api_base_url: string;
    api_key_configured: boolean;
    default_model: string | null;
    status: string;
    capabilities: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export interface HermesConnectionTestResponse {
    ok: boolean;
    capabilities: Record<string, unknown> | null;
}
