import { defineStore } from "pinia";

import { createAgent, disableAgent, enableAgent, fetchAgentProfile, fetchAgents, updateAgent } from "@/api/agents";
import {
    connectOpenClaw,
    createInstance,
    deleteInstance,
    disableInstance,
    enableInstance,
    fetchInstanceCredentials,
    fetchInstanceHealth,
    fetchInstances,
    syncOpenClawAgents,
    updateOpenClawInstance,
} from "@/api/instances";
import {
    toOpenClawConnectResultView,
    toOpenClawInstanceView,
} from "@/stores/openclawMappers";
import type {
    OpenClawAgentCreateInput,
    OpenClawAgentProfileView,
    OpenClawAgentUpdateInput,
    OpenClawAgentView,
    OpenClawConnectResultView,
    OpenClawInstanceCreateInput,
    OpenClawInstanceCredentialsView,
    OpenClawInstanceUpdateInput,
    OpenClawInstanceView,
    OpenClawQuickConnectInput,
    OpenClawSyncAgentsView,
} from "@/types/view/openclaw";
import { camelizeKeys } from "@/utils/case";

export const useOpenClawStore = defineStore("openclaw", {
    state: () => ({
        instances: [] as OpenClawInstanceView[],
        loading: false,
        savingId: null as string | null,
        creating: false,
        creatingAgentForInstanceId: null as number | null,
        editingAgentId: null as number | null,
        loadingAgentProfileId: null as number | null,
    }),
    actions: {
        async loadInstances() {
            this.loading = true;
            try {
                const instances = await fetchInstances();
                const items = await Promise.all(
                    instances.map(async (instance) => {
                        const agents = (await fetchAgents(instance.id)).map(camelizeKeys);
                        return toOpenClawInstanceView(instance, agents);
                    }),
                );
                this.instances = items;
            } finally {
                this.loading = false;
            }
        },
        async refreshInstanceHealth() {
            const items = await fetchInstanceHealth();
            const statusById = new Map(items.map((item) => [item.id, item.status]));
            this.instances = this.instances.map((instance) => ({
                ...instance,
                status: statusById.get(instance.id) ?? instance.status,
            }));
        },
        async createNewInstance(payload: OpenClawInstanceCreateInput) {
            this.creating = true;
            try {
                const instance = toOpenClawInstanceView(await createInstance({ ...payload, status: "active" }), []);
                await this.loadInstances();
                return instance;
            } finally {
                this.creating = false;
            }
        },
        async quickConnectInstance(payload: OpenClawQuickConnectInput): Promise<OpenClawConnectResultView> {
            this.creating = true;
            try {
                const result = await connectOpenClaw(payload);
                const agents = (await fetchAgents(result.instance.id)).map(camelizeKeys);
                await this.loadInstances();
                return toOpenClawConnectResultView(result, agents);
            } finally {
                this.creating = false;
            }
        },
        async updateInstance(instanceId: number, payload: OpenClawInstanceUpdateInput) {
            this.creating = true;
            try {
                const instance = toOpenClawInstanceView(
                    await updateOpenClawInstance(instanceId, {
                        ...payload,
                        channelAccountId: payload.channelAccountId ?? "default",
                    }),
                    [],
                );
                await this.loadInstances();
                return instance;
            } finally {
                this.creating = false;
            }
        },
        async loadInstanceCredentials(instanceId: number): Promise<OpenClawInstanceCredentialsView> {
            return camelizeKeys(await fetchInstanceCredentials(instanceId));
        },
        async syncInstanceAgents(instanceId: number): Promise<OpenClawSyncAgentsView> {
            this.savingId = `instance:${instanceId}:sync`;
            try {
                const result = camelizeKeys(await syncOpenClawAgents(instanceId));
                await this.loadInstances();
                return result;
            } finally {
                this.savingId = null;
            }
        },
        async setInstanceEnabled(instanceId: number, enabled: boolean) {
            this.savingId = `instance:${instanceId}`;
            try {
                await (enabled ? enableInstance(instanceId) : disableInstance(instanceId));
                await this.loadInstances();
            } finally {
                this.savingId = null;
            }
        },
        async deleteExistingInstance(instanceId: number) {
            this.savingId = `instance:${instanceId}:delete`;
            try {
                await deleteInstance(instanceId);
                await this.loadInstances();
            } finally {
                this.savingId = null;
            }
        },
        async setAgentEnabled(agentId: number, enabled: boolean) {
            this.savingId = `agent:${agentId}`;
            try {
                await (enabled ? enableAgent(agentId) : disableAgent(agentId));
                await this.loadInstances();
            } finally {
                this.savingId = null;
            }
        },
        async createNewAgent(instanceId: number, payload: OpenClawAgentCreateInput) {
            this.creatingAgentForInstanceId = instanceId;
            try {
                const agent = camelizeKeys(
                    await createAgent(instanceId, {
                        ...payload,
                        enabled: payload.enabled ?? true,
                    }),
                );
                await this.loadInstances();
                return agent;
            } finally {
                this.creatingAgentForInstanceId = null;
            }
        },
        async loadAgentProfile(agentId: number): Promise<OpenClawAgentProfileView> {
            this.loadingAgentProfileId = agentId;
            try {
                return camelizeKeys(await fetchAgentProfile(agentId));
            } finally {
                this.loadingAgentProfileId = null;
            }
        },
        async updateExistingAgent(agentId: number, payload: OpenClawAgentUpdateInput): Promise<OpenClawAgentView> {
            this.editingAgentId = agentId;
            try {
                const agent = camelizeKeys(await updateAgent(agentId, payload));
                await this.loadInstances();
                return agent;
            } finally {
                this.editingAgentId = null;
            }
        },
    },
});

export type { OpenClawInstanceView };
