/**
 * OpenClaw 模块前端业务层类型。
 *
 * 这里统一使用 camelCase，供页面、组件和 store 消费；
 * 与后端接口原样字段的转换放在 API 或 mapper 层处理。
 */
import type {
    OpenClawAgentProfileResponse,
    OpenClawAgentResponse,
} from "@/types/api/agent";
import type {
    OpenClawConnectResponse,
    OpenClawInstanceCredentialsResponse,
    OpenClawInstanceResponse,
    OpenClawSyncAgentsResponse,
} from "@/types/api/instance";
import type { Camelized } from "@/utils/case";

export type OpenClawAgentView = Camelized<OpenClawAgentResponse>;

export type OpenClawAgentProfileView = Camelized<OpenClawAgentProfileResponse>;

export interface OpenClawInstanceView extends Camelized<OpenClawInstanceResponse> {
    agents: OpenClawAgentView[];
}

export type OpenClawInstanceCredentialsView = Camelized<OpenClawInstanceCredentialsResponse>;

export type OpenClawSyncAgentsView = Camelized<OpenClawSyncAgentsResponse>;

export interface OpenClawConnectResultView extends Camelized<OpenClawConnectResponse> {
    instance: OpenClawInstanceView;
    credentials: OpenClawInstanceCredentialsView;
}

export interface OpenClawInstanceCreateInput {
    name: string;
    channelBaseUrl: string;
    channelAccountId: string;
    channelSigningSecret: string;
    callbackToken: string;
    status?: string;
}

export interface OpenClawQuickConnectInput {
    name: string;
    channelBaseUrl: string;
    channelAccountId?: string;
}

export interface OpenClawInstanceUpdateInput {
    name: string;
    channelBaseUrl: string;
    channelAccountId?: string;
}

export interface OpenClawAgentCreateInput {
    agentKey: string;
    displayName: string;
    roleName?: string | null;
    agentsMd?: string | null;
    toolsMd?: string | null;
    identityMd?: string | null;
    soulMd?: string | null;
    userMd?: string | null;
    memoryMd?: string | null;
    heartbeatMd?: string | null;
    enabled?: boolean;
}

export interface OpenClawAgentUpdateInput {
    displayName?: string | null;
    roleName?: string | null;
    agentsMd?: string | null;
    toolsMd?: string | null;
    identityMd?: string | null;
    soulMd?: string | null;
    userMd?: string | null;
    memoryMd?: string | null;
    heartbeatMd?: string | null;
    enabled?: boolean;
}
