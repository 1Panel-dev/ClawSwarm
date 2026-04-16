import { apiClient } from "@/api/client";
import type {
    ConversationListItemResponse,
    ConversationMessagesResponse,
    ConversationResponse,
    MessageResponse,
} from "@/types/api/conversation";
import type { ConversationListItemOutput, ConversationMessagesOutput, ConversationOutput } from "@/types/view/conversation";
import type { MessageOutput } from "@/types/view/message";
import { camelizeKeys, snakeizeKeys } from "@/utils/case";
import { toConversationListItemOutputList, toConversationMessagesOutput } from "@/stores/conversationMappers";
import { toMessageOutput } from "@/types/view/message";

export async function fetchConversationList(): Promise<ConversationListItemOutput[]> {
    const response = await apiClient.get<ConversationListItemResponse[]>("/api/conversations");
    return toConversationListItemOutputList(response.data);
}

export async function createDirectConversation(instanceId: number, agentId: number): Promise<ConversationOutput> {
    const response = await apiClient.post<ConversationResponse>("/api/conversations/direct", {
        instance_id: instanceId,
        agent_id: agentId,
    });
    return camelizeKeys(response.data);
}

export async function createGroupConversation(groupId: number): Promise<ConversationOutput> {
    const response = await apiClient.post<ConversationResponse>("/api/conversations/group", {
        group_id: groupId,
    });
    return camelizeKeys(response.data);
}

export async function fetchConversationMessages(
    conversationId: number,
    params?: {
        messageAfter?: string | null;
        dispatchAfter?: string | null;
        beforeMessageId?: string | null;
        limit?: number;
        includeDispatches?: boolean;
    },
): Promise<ConversationMessagesOutput> {
    const response = await apiClient.get<ConversationMessagesResponse>(`/api/conversations/${conversationId}/messages`, {
        params: {
            messageAfter: params?.messageAfter ?? undefined,
            dispatchAfter: params?.dispatchAfter ?? undefined,
            beforeMessageId: params?.beforeMessageId ?? undefined,
            limit: params?.limit ?? undefined,
            includeDispatches: params?.includeDispatches ?? undefined,
        },
    });
    return toConversationMessagesOutput(response.data);
}

export async function sendConversationMessage(
    conversationId: number,
    payload: { content: string; mentions?: string[]; useDedicatedDirectSession?: boolean },
): Promise<MessageOutput> {
    const response = await apiClient.post<MessageResponse>(
        `/api/conversations/${conversationId}/messages`,
        snakeizeKeys(payload),
    );
    return toMessageOutput(response.data);
}
