import { defineStore } from "pinia";

import {
    createHermesInstance,
    deleteHermesInstance,
    disableHermesInstance,
    enableHermesInstance,
    fetchHermesInstances,
    openHermesInstanceConversation,
    testHermesInstance,
    updateHermesInstance,
} from "@/api/hermes";
import type { HermesInstanceInput, HermesInstanceOutput } from "@/types/view/hermes";

export const useHermesStore = defineStore("hermes", {
    state: () => ({
        instances: [] as HermesInstanceOutput[],
        loading: false,
        savingId: null as string | null,
        creating: false,
    }),
    actions: {
        async loadInstances() {
            this.loading = true;
            try {
                this.instances = await fetchHermesInstances();
            } finally {
                this.loading = false;
            }
        },
        async createInstance(payload: HermesInstanceInput) {
            this.creating = true;
            try {
                const item = await createHermesInstance({...payload, status: "active"});
                await this.loadInstances();
                return item;
            } finally {
                this.creating = false;
            }
        },
        async updateInstance(instanceId: number, payload: HermesInstanceInput) {
            this.creating = true;
            try {
                const item = await updateHermesInstance(instanceId, payload);
                await this.loadInstances();
                return item;
            } finally {
                this.creating = false;
            }
        },
        async deleteInstance(instanceId: number) {
            this.savingId = `instance:${instanceId}:delete`;
            try {
                await deleteHermesInstance(instanceId);
                await this.loadInstances();
            } finally {
                this.savingId = null;
            }
        },
        async setInstanceEnabled(instanceId: number, enabled: boolean) {
            this.savingId = `instance:${instanceId}`;
            try {
                await (enabled ? enableHermesInstance(instanceId) : disableHermesInstance(instanceId));
                await this.loadInstances();
            } finally {
                this.savingId = null;
            }
        },
        async testInstance(instanceId: number) {
            this.savingId = `instance:${instanceId}:test`;
            try {
                const result = await testHermesInstance(instanceId);
                await this.loadInstances();
                return result;
            } finally {
                this.savingId = null;
            }
        },
        async openInstanceConversation(instanceId: number) {
            return await openHermesInstanceConversation(instanceId);
        },
    },
});
