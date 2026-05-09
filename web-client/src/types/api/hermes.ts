export interface HermesInstanceResponse {
    id: number;
    instance_key: string;
    name: string;
    api_base_url: string;
    api_key_configured: boolean;
    default_model: string | null;
    status: string;
    capabilities: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export interface HermesProfileResponse {
    id: number;
    instance_id: number;
    runtime_target_id: number;
    profile_key: string;
    cs_id: string;
    display_name: string;
    role_name: string | null;
    model: string | null;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface HermesConnectionTestResponse {
    ok: boolean;
    capabilities: Record<string, unknown> | null;
}
