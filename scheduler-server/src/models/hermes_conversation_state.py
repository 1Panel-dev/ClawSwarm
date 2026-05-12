"""ClawSwarm 会话与 Hermes Responses 会话状态的映射。"""

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class HermesConversationState(Base, TimestampMixin):
    __tablename__ = "hermes_conversation_states"
    __table_args__ = (
        UniqueConstraint("conversation_id", "hermes_instance_id", name="uq_hermes_conversation_instance"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(index=True)
    hermes_instance_id: Mapped[int] = mapped_column(index=True)
    hermes_conversation_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_response_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    active_run_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
