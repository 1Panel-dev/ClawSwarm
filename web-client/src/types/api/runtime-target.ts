/**
 * Runtime Target 接口的原始响应类型。
 */
export interface RuntimeTargetResponse {
    id: number;
    runtime_type: string;
    runtime_instance_id: number;
    runtime_profile_id: number;
    target_key: string;
    display_name: string;
    role_name: string | null;
    cs_id: string;
    enabled: boolean;
    instance_name: string;
}
