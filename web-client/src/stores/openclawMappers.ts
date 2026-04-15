/**
 * OpenClaw 接口响应到前端业务对象的转换函数。
 *
 * 这里只做 Response -> View 的稳定映射，
 * 让页面和 store 不再直接消费 snake_case 的接口字段。
 */

import type { AgentProfileReadApi, AgentReadApi } from "@/types/api/agent";
import type { ConnectInstanceResponseApi, InstanceCredentialsReadApi, InstanceReadApi } from "@/types/api/instance";
import type {
    OpenClawAgentProfileView,
    OpenClawAgentView,
    OpenClawConnectResultView,
    OpenClawInstanceCredentialsView,
    OpenClawInstanceView,
} from "@/types/view/openclaw";

export function toOpenClawAgentView(item: AgentReadApi): OpenClawAgentView {
    return {
        id: item.id,
        instanceId: item.instance_id,
        agentKey: item.agent_key,
        csId: item.cs_id,
        displayName: item.display_name,
        roleName: item.role_name,
        enabled: item.enabled,
        createdViaClawswarm: item.created_via_clawswarm,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}

export function toOpenClawAgentProfileView(item: AgentProfileReadApi): OpenClawAgentProfileView {
    return {
        ...toOpenClawAgentView(item),
        agentsMd: item.agents_md,
        toolsMd: item.tools_md,
        identityMd: item.identity_md,
        soulMd: item.soul_md,
        userMd: item.user_md,
        memoryMd: item.memory_md,
        heartbeatMd: item.heartbeat_md,
    };
}

export function toOpenClawInstanceView(item: InstanceReadApi, agents: OpenClawAgentView[]): OpenClawInstanceView {
    return {
        id: item.id,
        instanceKey: item.instance_key,
        name: item.name,
        channelBaseUrl: item.channel_base_url,
        channelAccountId: item.channel_account_id,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        agents,
    };
}

export function toOpenClawInstanceCredentialsView(item: InstanceCredentialsReadApi): OpenClawInstanceCredentialsView {
    return {
        outboundToken: item.outbound_token,
        inboundSigningSecret: item.inbound_signing_secret,
    };
}

export function toOpenClawConnectResultView(
    item: ConnectInstanceResponseApi,
    agents: OpenClawAgentView[],
): OpenClawConnectResultView {
    return {
        instance: toOpenClawInstanceView(item.instance, agents),
        importedAgentCount: item.imported_agent_count,
        agentKeys: item.agent_keys,
        credentials: toOpenClawInstanceCredentialsView(item.credentials),
    };
}
