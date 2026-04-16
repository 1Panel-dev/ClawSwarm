import { defineStore } from "pinia";

import { fetchAddressBook } from "@/api/addressBook";
import { fetchConversationList } from "@/api/conversations";
import { fetchMockAddressBook, fetchMockConversationList, isMessageMockEnabled } from "@/mocks/messageWorkbench";
import { toConversationListItemOutputList } from "@/stores/conversationMappers";
import type { AddressBookOutput } from "@/types/view/addressBook";
import type { ConversationListItemOutput } from "@/types/view/conversation";
import { camelizeKeys } from "@/utils/case";

const HIDDEN_RECENT_STORAGE_KEY = "clawswarm:hidden-recent-conversations";

type HiddenRecentConversationEntry = {
    hiddenAt: string;
    lastMessageId: string | null;
};

type HiddenRecentConversationMap = Record<string, HiddenRecentConversationEntry>;

export const useAddressBookStore = defineStore("addressBook", {
    state: () => ({
        loading: false,
        recentLoading: false,
        addressBook: null as AddressBookOutput | null,
        recentConversations: [] as ConversationListItemOutput[],
        hiddenRecentConversationMap: loadHiddenRecentConversationMap(),
    }),
    getters: {
        instances: (state) => state.addressBook?.instances ?? [],
        groups: (state) => state.addressBook?.groups ?? [],
        visibleRecentConversations: (state) =>
            state.recentConversations.filter((item) => {
                const hiddenEntry = state.hiddenRecentConversationMap[String(item.id)];
                if (!hiddenEntry) {
                    return true;
                }
                return item.lastMessageId !== hiddenEntry.lastMessageId;
            }),
    },
    actions: {
        async loadAddressBook() {
            this.loading = true;
            try {
                this.addressBook = isMessageMockEnabled() ? camelizeKeys(await fetchMockAddressBook()) : await fetchAddressBook();
            } finally {
                this.loading = false;
            }
        },
        async loadRecentConversations() {
            this.recentLoading = true;
            try {
                this.recentConversations = isMessageMockEnabled()
                    ? toConversationListItemOutputList(await fetchMockConversationList())
                    : await fetchConversationList();
                this.reconcileHiddenRecentConversations();
            } finally {
                this.recentLoading = false;
            }
        },
        async loadAll() {
            this.loading = true;
            try {
                if (isMessageMockEnabled()) {
                    const [addressBook, recentConversations] = await Promise.all([
                        fetchMockAddressBook(),
                        fetchMockConversationList(),
                    ]);
                    this.addressBook = camelizeKeys(addressBook);
                    this.recentConversations = toConversationListItemOutputList(recentConversations);
                } else {
                    const [addressBook, recentConversations] = await Promise.all([
                        fetchAddressBook(),
                        fetchConversationList(),
                    ]);
                    this.addressBook = addressBook;
                    this.recentConversations = recentConversations;
                }
                this.reconcileHiddenRecentConversations();
            } finally {
                this.loading = false;
            }
        },
        async refreshRecentConversations() {
            this.recentConversations = isMessageMockEnabled()
                ? toConversationListItemOutputList(await fetchMockConversationList())
                : await fetchConversationList();
            this.reconcileHiddenRecentConversations();
        },
        hideRecentConversation(conversationId: number) {
            const currentConversation = this.recentConversations.find((item) => item.id === conversationId);
            this.hiddenRecentConversationMap = {
                ...this.hiddenRecentConversationMap,
                [String(conversationId)]: {
                    hiddenAt: new Date().toISOString(),
                    lastMessageId: currentConversation?.lastMessageId ?? null,
                },
            };
            persistHiddenRecentConversationMap(this.hiddenRecentConversationMap);
        },
        reconcileHiddenRecentConversations() {
            let changed = false;
            const nextMap: HiddenRecentConversationMap = { ...this.hiddenRecentConversationMap };
            for (const item of this.recentConversations) {
                const key = String(item.id);
                const hiddenEntry = nextMap[key];
                if (!hiddenEntry) {
                    continue;
                }
                // 会话内容变化后，自动恢复到最近联系人列表。
                if (item.lastMessageId !== hiddenEntry.lastMessageId) {
                    delete nextMap[key];
                    changed = true;
                }
            }
            if (!changed) {
                return;
            }
            this.hiddenRecentConversationMap = nextMap;
            persistHiddenRecentConversationMap(this.hiddenRecentConversationMap);
        },
    },
});

function loadHiddenRecentConversationMap(): HiddenRecentConversationMap {
    if (typeof window === "undefined") {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(HIDDEN_RECENT_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }
        return normalizeHiddenRecentConversationMap(parsed as Record<string, unknown>);
    } catch {
        return {};
    }
}

function persistHiddenRecentConversationMap(value: HiddenRecentConversationMap) {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(HIDDEN_RECENT_STORAGE_KEY, JSON.stringify(value));
}

function normalizeHiddenRecentConversationMap(value: Record<string, unknown>): HiddenRecentConversationMap {
    const entries = Object.entries(value).flatMap(([conversationId, rawEntry]) => {
        if (typeof rawEntry === "string") {
            // 兼容只保存隐藏时间的旧格式。
            return [[conversationId, { hiddenAt: rawEntry, lastMessageId: null } satisfies HiddenRecentConversationEntry] as const];
        }
        if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
            return [];
        }
        const hiddenAt =
            typeof (rawEntry as { hiddenAt?: unknown }).hiddenAt === "string"
                ? (rawEntry as { hiddenAt: string }).hiddenAt
                : typeof (rawEntry as { hidden_at?: unknown }).hidden_at === "string"
                    ? (rawEntry as { hidden_at: string }).hidden_at
                : null;
        const lastMessageId =
            (rawEntry as { lastMessageId?: unknown }).lastMessageId
            ?? (rawEntry as { last_message_id?: unknown }).last_message_id;
        if (!hiddenAt) {
            return [];
        }
        return [[
            conversationId,
            {
                hiddenAt,
                lastMessageId: typeof lastMessageId === "string" ? lastMessageId : null,
            } satisfies HiddenRecentConversationEntry,
        ] as const];
    });
    return Object.fromEntries(entries);
}
