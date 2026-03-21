import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
    state: () => ({
        initialized: false,
        globalLoading: false,
        lastErrorMessage: "" as string | null,
    }),
    actions: {
        markInitialized() {
            this.initialized = true;
        },
        setGlobalLoading(value: boolean) {
            this.globalLoading = value;
        },
        setLastErrorMessage(message: string | null) {
            this.lastErrorMessage = message;
        },
    },
});
