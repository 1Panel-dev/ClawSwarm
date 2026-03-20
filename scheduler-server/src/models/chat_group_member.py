from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


class ChatGroupMember(Base):
    __tablename__ = "chat_group_members"
    __table_args__ = (UniqueConstraint("group_id", "agent_id", name="uq_group_agent"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("chat_groups.id"), index=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("openclaw_instances.id"), index=True)
    agent_id: Mapped[int] = mapped_column(ForeignKey("agent_profiles.id"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
