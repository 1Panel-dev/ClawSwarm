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


class MessageCreate(BaseModel):
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
