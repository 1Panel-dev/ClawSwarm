"""
这个模型表示“某个群组包含某个实例下的某个 Agent”。

它是跨实例群聊能够成立的关键关系表：
1. group_id 指向一个群。
2. instance_id 指明这个成员属于哪套 OpenClaw。
3. agent_id 指向该实例下具体哪个 Agent。
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


class ChatGroupMember(Base):
    __tablename__ = "chat_group_members"
    # 同一个群里不允许重复添加同一个 agent。
    __table_args__ = (UniqueConstraint("group_id", "agent_id", name="uq_group_agent"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("chat_groups.id"), index=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("openclaw_instances.id"), index=True)
    agent_id: Mapped[int] = mapped_column(ForeignKey("agent_profiles.id"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
