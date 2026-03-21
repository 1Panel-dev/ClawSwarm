/**
 * 这里放前端实际展示层使用的 ViewModel。
 *
 * 和 api 类型分开，可以让页面组件少关心后端命名细节。
 */
import type { ConversationListItemApi } from "@/types/api/conversation";

export interface ConversationListItemView {
    id: number;
    kind: "direct" | "group";
    title: string;
    subtitle: string;
    preview: string;
    timeText: string;
    status: string | null;
}

export function toConversationListItemView(item: ConversationListItemApi): ConversationListItemView {
    return {
        id: item.id,
        kind: item.type === "group" ? "group" : "direct",
        title: item.display_title,
        subtitle:
            item.type === "group"
                ? item.group_name ?? ""
                : [item.instance_name, item.agent_display_name].filter(Boolean).join(" / "),
        preview: item.last_message_preview ?? "暂无消息",
        timeText: item.last_message_at ?? item.updated_at,
        status: item.last_message_status,
    };
}
