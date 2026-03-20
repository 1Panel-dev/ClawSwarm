"""
这里定义会话、消息和 dispatch 查询相关的 schema。

它是前端聊天页最核心的一组接口结构：
1. 创建 direct / group conversation。
2. 发消息。
3. 查询消息列表和 dispatch 状态。
4. 查询会话列表，用于左侧最近会话区域。
5. 支持前端轮询时做最小增量拉取。
"""
from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel


class DirectConversationCreate(BaseModel):
    instance_id: int
    agent_id: int


class GroupConversationCreate(BaseModel):
    group_id: int


class ConversationRead(TimestampedModel):
    id: int
    type: str
    title: str | None
    group_id: int | None
    direct_instance_id: int | None
    direct_agent_id: int | None


class ConversationListItem(TimestampedModel):
    # 这个结构专门给前端左侧会话列表使用。
    # 它比 ConversationRead 多了一层“展示友好字段”，避免前端自己再拼标题和最近消息摘要。
    id: int
    type: str
    title: str | None
    group_id: int | None
    direct_instance_id: int | None
    direct_agent_id: int | None
    display_title: str
    group_name: str | None
    instance_name: str | None
    agent_display_name: str | None
    last_message_id: str | None
    last_message_preview: str | None
    last_message_sender_type: str | None
    last_message_sender_label: str | None
    last_message_at: str | None
    last_message_status: str | None


class MessageCreate(BaseModel):
    # mentions 只在群聊里有意义；direct 场景下通常为空数组。
    content: str = Field(min_length=1)
    mentions: list[str] = Field(default_factory=list)


class MessageRead(TimestampedModel):
    id: str
    conversation_id: int
    sender_type: str
    sender_label: str
    content: str
    status: str


class DispatchRead(TimestampedModel):
    # dispatch 把“发给谁、现在执行到哪一步”暴露给前端和排障工具。
    id: str
    message_id: str
    conversation_id: int
    instance_id: int
    agent_id: int
    dispatch_mode: str
    channel_message_id: str | None
    channel_trace_id: str | None
    session_key: str | None
    status: str
    error_message: str | None


class ConversationMessagesResponse(BaseModel):
    conversation: ConversationRead
    messages: list[MessageRead]
    dispatches: list[DispatchRead]
    next_message_cursor: str | None
    next_dispatch_cursor: str | None
