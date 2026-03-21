import { defineStore } from "pinia";

export const useSettingsStore = defineStore("settings", {
    state: () => ({
        prefersCompactMode: false,
    }),
    actions: {
        setPrefersCompactMode(value: boolean) {
            this.prefersCompactMode = value;
        },
    },
});
