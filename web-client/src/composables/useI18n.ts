import { computed, unref } from "vue";
import type { Language } from "element-plus/es/locale/index";
import en from "element-plus/es/locale/lang/en";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import { useI18n as useVueI18n } from "vue-i18n";

import { LOCALE_STORAGE_KEY, messages, type SupportedLocale } from "@/i18n";

export function useI18n() {
    const { locale, t } = useVueI18n();
    const elementLocale = computed<Language>(() => (locale.value === "zh-CN" ? zhCn : en));
    const localeOptions = computed(() => [
        { value: "en" as const, label: messages[locale.value as SupportedLocale].locale.en },
        { value: "zh-CN" as const, label: messages[locale.value as SupportedLocale].locale.zhCN },
    ]);

    function setLocale(value: SupportedLocale) {
        locale.value = value;
        if (typeof window !== "undefined") {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
        }
        if (typeof document !== "undefined") {
            document.documentElement.lang = value;
        }
    }

    return {
        locale: computed(() => unref(locale) as SupportedLocale),
        localeOptions,
        elementLocale,
        setLocale,
        t,
    };
}
