import { defineStore } from "pinia";

import {
    createDirectConversation,
    createGroupConversation,
    fetchConversationMessages,
    sendConversationMessage,
} from "@/api/conversations";
import {
    createMockDirectConversation,
    createMockGroupConversation,
    fetchMockConversationMessages,
    isMessageMockEnabled,
    sendMockConversationMessage,
} from "@/mocks/messageWorkbench";
import { useAddressBookStore } from "@/stores/addressBook";
import type { ConversationReadApi, DispatchReadApi, MessageReadApi } from "@/types/api/conversation";

function mergeById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of base) {
        map.set(item.id, item);
    }
    for (const item of incoming) {
        map.set(item.id, item);
    }
    return Array.from(map.values());
}

export const useConversationStore = defineStore("conversation", {
    state: () => ({
        currentConversationId: null as number | null,
        currentConversation: null as ConversationReadApi | null,
        messages: [] as MessageReadApi[],
        dispatches: [] as DispatchReadApi[],
        nextMessageCursor: null as string | null,
        nextDispatchCursor: null as string | null,
        loading: false,
        sending: false,
        lastErrorMessage: null as string | null,
    }),
    actions: {
        async openDirectConversation(instanceId: number, agentId: number) {
            const conversation = isMessageMockEnabled()
                ? await createMockDirectConversation(instanceId, agentId)
                : await createDirectConversation(instanceId, agentId);
            await useAddressBookStore().refreshRecentConversations();
            await this.openConversation(conversation.id, conversation);
        },
        async openGroupConversation(groupId: number) {
            const conversation = isMessageMockEnabled()
                ? await createMockGroupConversation(groupId)
                : await createGroupConversation(groupId);
            await useAddressBookStore().refreshRecentConversations();
            await this.openConversation(conversation.id, conversation);
        },
        async openConversation(conversationId: number, seedConversation?: ConversationReadApi) {
            this.currentConversationId = conversationId;
            this.currentConversation = seedConversation ?? null;
            this.messages = [];
            this.dispatches = [];
            this.nextMessageCursor = null;
            this.nextDispatchCursor = null;
            this.lastErrorMessage = null;
            await this.reloadCurrentConversation();
        },
        async reloadCurrentConversation() {
            if (!this.currentConversationId) {
                return;
            }
            this.loading = true;
            try {
                const payload = isMessageMockEnabled()
                    ? await fetchMockConversationMessages(this.currentConversationId)
                    : await fetchConversationMessages(this.currentConversationId);
                this.currentConversation = payload.conversation;
                this.messages = payload.messages;
                this.dispatches = payload.dispatches;
                this.nextMessageCursor = payload.next_message_cursor;
                this.nextDispatchCursor = payload.next_dispatch_cursor;
                this.lastErrorMessage = null;
            } catch (error) {
                this.lastErrorMessage = error instanceof Error ? error.message : "加载会话失败";
                throw error;
            } finally {
                this.loading = false;
            }
        },
        async pollCurrentConversation() {
            if (!this.currentConversationId) {
                return;
            }
            try {
                const payload = isMessageMockEnabled()
                    ? await fetchMockConversationMessages(this.currentConversationId, {
                        messageAfter: this.nextMessageCursor,
                        dispatchAfter: this.nextDispatchCursor,
                    })
                    : await fetchConversationMessages(this.currentConversationId, {
                        messageAfter: this.nextMessageCursor,
                        dispatchAfter: this.nextDispatchCursor,
                    });
                this.currentConversation = payload.conversation;
                this.messages = mergeById(this.messages, payload.messages);
                this.dispatches = mergeById(this.dispatches, payload.dispatches);
                this.nextMessageCursor = payload.next_message_cursor;
                this.nextDispatchCursor = payload.next_dispatch_cursor;
                this.lastErrorMessage = null;
            } catch (error) {
                this.lastErrorMessage = error instanceof Error ? error.message : "轮询会话失败";
            }
        },
        async sendMessage(content: string, mentions: string[] = [], useDedicatedDirectSession = false) {
            if (!this.currentConversationId || !content.trim()) {
                return;
            }
            this.sending = true;
            try {
                const message = isMessageMockEnabled()
                    ? await sendMockConversationMessage(this.currentConversationId, {
                        content,
                        mentions,
                        useDedicatedDirectSession,
                    })
                    : await sendConversationMessage(this.currentConversationId, {
                        content,
                        mentions,
                        use_dedicated_direct_session: useDedicatedDirectSession,
                    });
                this.messages = mergeById(this.messages, [message as MessageReadApi]);
                this.nextMessageCursor = (message as MessageReadApi).id;
                await useAddressBookStore().refreshRecentConversations();
                this.lastErrorMessage = null;
            } catch (error) {
                this.lastErrorMessage = error instanceof Error ? error.message : "发送消息失败";
                throw error;
            } finally {
                this.sending = false;
            }
        },
        async refreshConversationList() {
            await useAddressBookStore().refreshRecentConversations();
        },
    },
});
