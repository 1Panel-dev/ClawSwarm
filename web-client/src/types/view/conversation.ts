/**
 * 会话模块的前端输出模型。
 */
import type {
    ConversationListItemResponse,
    ConversationMessagesResponse,
    ConversationResponse,
    DispatchResponse,
} from "@/types/api/conversation";
import type { Camelized } from "@/utils/case";
import type { MessageOutput } from "@/types/view/message";

export type ConversationOutput = Camelized<ConversationResponse>;

export type DispatchOutput = Camelized<DispatchResponse>;

export interface ConversationMessagesOutput extends Camelized<Omit<ConversationMessagesResponse, "conversation" | "messages" | "dispatches">> {
    conversation: ConversationOutput;
    messages: MessageOutput[];
    dispatches: DispatchOutput[];
}

export interface ConversationListItemOutput {
    id: number;
    kind: "direct" | "group" | "agent_dialogue";
    title: string;
    subtitle: string;
    instanceName: string | null;
    agentDisplayName: string | null;
    preview: string;
    timeText: string;
    status: string | null;
    lastMessageId: string | null;
}

export function toConversationListItemOutput(item: ConversationListItemResponse): ConversationListItemOutput {
    return {
        id: item.id,
        kind: item.type === "group" ? "group" : item.type === "agent_dialogue" ? "agent_dialogue" : "direct",
        title: item.display_title,
        subtitle:
            item.type === "group"
                ? item.group_name ?? ""
                : [item.instance_name, item.agent_display_name].filter(Boolean).join(" / "),
        instanceName: item.instance_name,
        agentDisplayName: item.agent_display_name,
        preview: item.last_message_preview ?? "暂无消息",
        timeText: item.last_message_at ?? item.updated_at,
        status: item.last_message_status,
        lastMessageId: item.last_message_id,
    };
}
