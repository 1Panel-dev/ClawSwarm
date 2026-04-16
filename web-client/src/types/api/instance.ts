export interface OpenClawInstanceResponse {
    id: number;
    instance_key: string;
    name: string;
    channel_base_url: string;
    channel_account_id: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface OpenClawInstanceHealthResponse {
    id: number;
    status: string;
}

export interface OpenClawInstanceCredentialsResponse {
    outbound_token: string;
    inbound_signing_secret: string;
}

export interface OpenClawConnectResponse {
    instance: OpenClawInstanceResponse;
    imported_agent_count: number;
    agent_keys: string[];
    credentials: OpenClawInstanceCredentialsResponse;
}

export interface OpenClawSyncAgentsResponse {
    instance: OpenClawInstanceResponse;
    imported_agent_count: number;
    agent_keys: string[];
}
