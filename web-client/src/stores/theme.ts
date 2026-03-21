import { defineStore } from "pinia";

import { applyTheme, getStoredTheme } from "@/theme/applyTheme";
import { themeOptions, type ThemeId } from "@/theme/themes";

export const useThemeStore = defineStore("theme", {
    state: () => ({
        themeId: getStoredTheme() as ThemeId,
        options: themeOptions,
    }),
    actions: {
        setTheme(themeId: ThemeId) {
            this.themeId = themeId;
            applyTheme(themeId);
        },
    },
});
