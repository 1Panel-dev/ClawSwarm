import { defineStore } from "pinia";

import {
    createAgentDialogue,
    fetchAgentDialogue,
    pauseAgentDialogue,
    resumeAgentDialogue,
    sendAgentDialogueMessage,
    stopAgentDialogue,
} from "@/api/agent-dialogues";
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
import { toConversationMessagesOutput } from "@/stores/conversationMappers";
import { useAddressBookStore } from "@/stores/addressBook";
import type { AgentDialogueCreateInput, AgentDialogueOutput } from "@/types/view/agent-dialogue";
import type { ConversationOutput, DispatchOutput } from "@/types/view/conversation";
import type { MessageOutput } from "@/types/view/message";
import { toMessageOutput } from "@/types/view/message";
import { camelizeKeys } from "@/utils/case";

const CONVERSATION_INITIAL_PAGE_SIZE = 100;
const CONVERSATION_HISTORY_PAGE_SIZE = 100;

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
        currentConversation: null as ConversationOutput | null,
        currentAgentDialogue: null as AgentDialogueOutput | null,
        messages: [] as MessageOutput[],
        dispatches: [] as DispatchOutput[],
        nextMessageCursor: null as string | null,
        nextDispatchCursor: null as string | null,
        oldestLoadedMessageId: null as string | null,
        hasMoreMessages: false,
        loadingOlderMessages: false,
        loading: false,
        sending: false,
        lastErrorMessage: null as string | null,
    }),
    actions: {
        async openDirectConversation(instanceId: number, agentId: number) {
            const conversation = isMessageMockEnabled()
                ? camelizeKeys(await createMockDirectConversation(instanceId, agentId))
                : await createDirectConversation(instanceId, agentId);
            await useAddressBookStore().refreshRecentConversations();
            await this.openConversation(conversation.id, conversation);
        },
        async openGroupConversation(groupId: number) {
            const conversation = isMessageMockEnabled()
                ? camelizeKeys(await createMockGroupConversation(groupId))
                : await createGroupConversation(groupId);
            await useAddressBookStore().refreshRecentConversations();
            await this.openConversation(conversation.id, conversation);
        },
        async createAndOpenAgentDialogue(payload: AgentDialogueCreateInput) {
            const dialogue = await createAgentDialogue(payload);
            await useAddressBookStore().refreshRecentConversations();
            await this.openConversation(dialogue.conversationId);
            return dialogue;
        },
        async openConversation(conversationId: number, seedConversation?: ConversationOutput) {
            this.currentConversationId = conversationId;
            this.currentConversation = seedConversation ?? null;
            this.currentAgentDialogue = null;
            this.messages = [];
            this.dispatches = [];
            this.nextMessageCursor = null;
            this.nextDispatchCursor = null;
            this.oldestLoadedMessageId = null;
            this.hasMoreMessages = false;
            this.loadingOlderMessages = false;
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
                    ? toConversationMessagesOutput(await fetchMockConversationMessages(this.currentConversationId))
                    : await fetchConversationMessages(this.currentConversationId, {
                        limit: CONVERSATION_INITIAL_PAGE_SIZE,
                        includeDispatches: true,
                    });
                this.currentConversation = payload.conversation;
                this.currentAgentDialogue = payload.conversation.agentDialogueId
                    ? await fetchAgentDialogue(payload.conversation.agentDialogueId)
                    : null;
                this.messages = payload.messages;
                this.dispatches = payload.dispatches;
                this.nextMessageCursor = payload.nextMessageCursor;
                this.nextDispatchCursor = payload.nextDispatchCursor;
                this.oldestLoadedMessageId = payload.oldestLoadedMessageId;
                this.hasMoreMessages = payload.hasMoreMessages;
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
                    ? toConversationMessagesOutput(
                        await fetchMockConversationMessages(this.currentConversationId, {
                            messageAfter: this.nextMessageCursor,
                            dispatchAfter: this.nextDispatchCursor,
                        }),
                    )
                    : await fetchConversationMessages(this.currentConversationId, {
                        limit: CONVERSATION_INITIAL_PAGE_SIZE,
                        includeDispatches: true,
                    });
                this.currentConversation = payload.conversation;
                this.currentAgentDialogue = payload.conversation.agentDialogueId
                    ? await fetchAgentDialogue(payload.conversation.agentDialogueId)
                    : null;
                this.messages = mergeById(this.messages, payload.messages);
                this.dispatches = mergeById(this.dispatches, payload.dispatches);
                this.nextMessageCursor = payload.nextMessageCursor;
                this.nextDispatchCursor = payload.nextDispatchCursor;
                if (!this.oldestLoadedMessageId) {
                    this.oldestLoadedMessageId = payload.oldestLoadedMessageId;
                }
                this.hasMoreMessages = payload.hasMoreMessages || this.hasMoreMessages;
                this.lastErrorMessage = null;
            } catch (error) {
                this.lastErrorMessage = error instanceof Error ? error.message : "轮询会话失败";
            }
        },
        async loadOlderMessages() {
            if (!this.currentConversationId || !this.oldestLoadedMessageId || !this.hasMoreMessages || this.loadingOlderMessages) {
                return [];
            }
            this.loadingOlderMessages = true;
            try {
                const payload = await fetchConversationMessages(this.currentConversationId, {
                    beforeMessageId: this.oldestLoadedMessageId,
                    limit: CONVERSATION_HISTORY_PAGE_SIZE,
                    includeDispatches: false,
                });
                this.messages = mergeById(payload.messages, this.messages);
                this.oldestLoadedMessageId = payload.oldestLoadedMessageId;
                this.hasMoreMessages = payload.hasMoreMessages;
                this.lastErrorMessage = null;
                return payload.messages;
            } catch (error) {
                this.lastErrorMessage = error instanceof Error ? error.message : "加载更早消息失败";
                throw error;
            } finally {
                this.loadingOlderMessages = false;
            }
        },
        async sendMessage(content: string, mentions: string[] = [], useDedicatedDirectSession = false) {
            if (!this.currentConversationId || !content.trim()) {
                return;
            }
            this.sending = true;
            try {
                const message = isMessageMockEnabled()
                    ? toMessageOutput(
                        await sendMockConversationMessage(this.currentConversationId, {
                            content,
                            mentions,
                            useDedicatedDirectSession,
                        }),
                    )
                    : await sendConversationMessage(this.currentConversationId, {
                        content,
                        mentions,
                        useDedicatedDirectSession,
                    });
                this.messages = mergeById(this.messages, [message]);
                this.nextMessageCursor = message.id;
                await useAddressBookStore().refreshRecentConversations();
                this.lastErrorMessage = null;
            } catch (error) {
                this.lastErrorMessage = error instanceof Error ? error.message : "发送消息失败";
                throw error;
            } finally {
                this.sending = false;
            }
        },
        async pauseCurrentAgentDialogue(dialogueId: number) {
            await pauseAgentDialogue(dialogueId);
            this.currentAgentDialogue = await fetchAgentDialogue(dialogueId);
            await this.reloadCurrentConversation();
            await useAddressBookStore().refreshRecentConversations();
        },
        async resumeCurrentAgentDialogue(dialogueId: number) {
            await resumeAgentDialogue(dialogueId);
            this.currentAgentDialogue = await fetchAgentDialogue(dialogueId);
            await this.reloadCurrentConversation();
            await useAddressBookStore().refreshRecentConversations();
        },
        async stopCurrentAgentDialogue(dialogueId: number) {
            await stopAgentDialogue(dialogueId);
            this.currentAgentDialogue = await fetchAgentDialogue(dialogueId);
            await this.reloadCurrentConversation();
            await useAddressBookStore().refreshRecentConversations();
        },
        async sendAgentDialogueIntervention(dialogueId: number, content: string) {
            if (!content.trim()) {
                return;
            }
            await sendAgentDialogueMessage(dialogueId, { content });
            this.currentAgentDialogue = await fetchAgentDialogue(dialogueId);
            await this.reloadCurrentConversation();
            await useAddressBookStore().refreshRecentConversations();
        },
        async refreshConversationList() {
            await useAddressBookStore().refreshRecentConversations();
        },
    },
});
