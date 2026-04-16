import type { ConversationListItemResponse, ConversationMessagesResponse, MessageResponse } from "@/types/api/conversation";
import type {
    ConversationListItemOutput,
    ConversationMessagesOutput,
} from "@/types/view/conversation";
import type { MessageOutput } from "@/types/view/message";
import { toConversationListItemOutput } from "@/types/view/conversation";
import { toMessageOutput } from "@/types/view/message";
import { camelizeKeys } from "@/utils/case";

export function toMessageOutputList(items: MessageResponse[]): MessageOutput[] {
    return items.map(toMessageOutput);
}

export function toConversationMessagesOutput(payload: ConversationMessagesResponse): ConversationMessagesOutput {
    return {
        conversation: camelizeKeys(payload.conversation),
        messages: toMessageOutputList(payload.messages),
        dispatches: payload.dispatches.map((item) => camelizeKeys(item)),
        nextMessageCursor: payload.next_message_cursor,
        nextDispatchCursor: payload.next_dispatch_cursor,
        hasMoreMessages: payload.has_more_messages,
        oldestLoadedMessageId: payload.oldest_loaded_message_id,
    };
}

export function toConversationListItemOutputList(items: ConversationListItemResponse[]): ConversationListItemOutput[] {
    return items.map(toConversationListItemOutput);
}
