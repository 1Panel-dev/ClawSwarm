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
    dispatch_mode: Mapped[str] = mapped_column(String(32))
    channel_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    channel_trace_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    session_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
