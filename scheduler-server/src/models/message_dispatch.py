"""
这个模型表示“某条用户消息投递给某个 Agent 的一次执行记录”。

它是消息系统和 channel 回调系统之间的桥：
1. 发消息时先创建 dispatch。
2. channel 返回 traceId / sessionKey 后回填这里。
3. callback 回来时再根据这里更新执行状态。
"""
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class MessageDispatch(Base, TimestampMixin):
    __tablename__ = "message_dispatches"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    message_id: Mapped[str] = mapped_column(ForeignKey("messages.id"), index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), index=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("openclaw_instances.id"), index=True)
    agent_id: Mapped[int] = mapped_column(ForeignKey("agent_profiles.id"), index=True)
    # direct / group_broadcast / group_mention
    dispatch_mode: Mapped[str] = mapped_column(String(32))
    channel_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    channel_trace_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    session_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
