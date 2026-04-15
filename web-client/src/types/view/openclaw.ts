/**
 * OpenClaw 模块前端业务层类型。
 *
 * 这里统一使用 camelCase，供页面、组件和 store 消费；
 * 与后端接口原样字段的转换放在 API 或 mapper 层处理。
 */

export interface OpenClawAgentView {
    id: number;
    instanceId: number;
    agentKey: string;
    csId: string;
    displayName: string;
    roleName: string | null;
    enabled: boolean;
    createdViaClawswarm: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OpenClawAgentProfileView extends OpenClawAgentView {
    agentsMd: string;
    toolsMd: string;
    identityMd: string;
    soulMd: string;
    userMd: string;
    memoryMd: string;
    heartbeatMd: string;
}

export interface OpenClawInstanceView {
    id: number;
    instanceKey: string;
    name: string;
    channelBaseUrl: string;
    channelAccountId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    agents: OpenClawAgentView[];
}

export interface OpenClawInstanceCredentialsView {
    outboundToken: string;
    inboundSigningSecret: string;
}

export interface OpenClawConnectResultView {
    instance: OpenClawInstanceView;
    importedAgentCount: number;
    agentKeys: string[];
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
