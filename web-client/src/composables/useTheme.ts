import { computed } from "vue";

import { useThemeStore } from "@/stores/theme";

export function useTheme() {
    const themeStore = useThemeStore();

    return {
        themeId: computed(() => themeStore.themeId),
        themeOptions: computed(() => themeStore.options),
        setTheme: themeStore.setTheme,
    };
}
