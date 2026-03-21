import { defineStore } from "pinia";

import { fetchAddressBook } from "@/api/addressBook";
import { fetchConversationList } from "@/api/conversations";
import { fetchMockAddressBook, fetchMockConversationList, isMessageMockEnabled } from "@/mocks/messageWorkbench";
import type { AddressBookResponseApi } from "@/types/api/addressBook";
import type { ConversationListItemApi } from "@/types/api/conversation";

export const useAddressBookStore = defineStore("addressBook", {
    state: () => ({
        loading: false,
        recentLoading: false,
        addressBook: null as AddressBookResponseApi | null,
        recentConversations: [] as ConversationListItemApi[],
    }),
    getters: {
        instances: (state) => state.addressBook?.instances ?? [],
        groups: (state) => state.addressBook?.groups ?? [],
    },
    actions: {
        async loadAddressBook() {
            this.loading = true;
            try {
                this.addressBook = isMessageMockEnabled() ? await fetchMockAddressBook() : await fetchAddressBook();
            } finally {
                this.loading = false;
            }
        },
        async loadRecentConversations() {
            this.recentLoading = true;
            try {
                this.recentConversations = isMessageMockEnabled()
                    ? await fetchMockConversationList()
                    : await fetchConversationList();
            } finally {
                this.recentLoading = false;
            }
        },
        async loadAll() {
            this.loading = true;
            try {
                const [addressBook, recentConversations] = isMessageMockEnabled()
                    ? await Promise.all([fetchMockAddressBook(), fetchMockConversationList()])
                    : await Promise.all([fetchAddressBook(), fetchConversationList()]);
                this.addressBook = addressBook;
                this.recentConversations = recentConversations;
            } finally {
                this.loading = false;
            }
        },
        async refreshRecentConversations() {
            this.recentConversations = isMessageMockEnabled()
                ? await fetchMockConversationList()
                : await fetchConversationList();
        },
    },
});
