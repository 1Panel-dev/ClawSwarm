import { defineStore } from "pinia";

import {
    createHermesInstance,
    createHermesProfile,
    deleteHermesInstance,
    deleteHermesProfile,
    disableHermesInstance,
    disableHermesProfile,
    enableHermesInstance,
    enableHermesProfile,
    fetchHermesInstances,
    fetchHermesProfiles,
    openHermesProfileConversation,
    testHermesInstance,
    updateHermesInstance,
    updateHermesProfile,
} from "@/api/hermes";
import type { HermesInstanceInput, HermesInstanceOutput, HermesProfileInput } from "@/types/view/hermes";

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
                const instances = await fetchHermesInstances();
                this.instances = await Promise.all(
                    instances.map(async (instance) => ({
                        ...instance,
                        profiles: await fetchHermesProfiles(instance.id),
                    })),
                );
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
        async createProfile(instanceId: number, payload: HermesProfileInput) {
            this.savingId = `instance:${instanceId}:profile`;
            try {
                const item = await createHermesProfile(instanceId, payload);
                await this.loadInstances();
                return item;
            } finally {
                this.savingId = null;
            }
        },
        async updateProfile(profileId: number, payload: HermesProfileInput) {
            this.savingId = `profile:${profileId}`;
            try {
                const item = await updateHermesProfile(profileId, payload);
                await this.loadInstances();
                return item;
            } finally {
                this.savingId = null;
            }
        },
        async deleteProfile(profileId: number) {
            this.savingId = `profile:${profileId}:delete`;
            try {
                await deleteHermesProfile(profileId);
                await this.loadInstances();
            } finally {
                this.savingId = null;
            }
        },
        async setProfileEnabled(profileId: number, enabled: boolean) {
            this.savingId = `profile:${profileId}`;
            try {
                await (enabled ? enableHermesProfile(profileId) : disableHermesProfile(profileId));
                await this.loadInstances();
            } finally {
                this.savingId = null;
            }
        },
        async openProfileConversation(profileId: number) {
            return await openHermesProfileConversation(profileId);
        },
    },
});
