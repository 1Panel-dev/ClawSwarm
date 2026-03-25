"""
这个模型表示某个 OpenClaw 实例下的一个 Agent。

在第一阶段里，Agent 主要承担三件事：
1. 作为通讯录展示对象。
2. 作为单聊会话的直接目标。
3. 作为群成员和 dispatch 的路由目标。
"""
from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class AgentProfile(Base, TimestampMixin):
    __tablename__ = "agent_profiles"
    # 同一个实例下 agent_key 必须唯一，因为后续要把它发给 claw-team channel 作为真实路由键。
    __table_args__ = (UniqueConstraint("instance_id", "agent_key", name="uq_agent_instance_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("openclaw_instances.id"), index=True)
    agent_key: Mapped[str] = mapped_column(String(120))
    display_name: Mapped[str] = mapped_column(String(120))
    role_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_via_claw_team: Mapped[bool] = mapped_column(Boolean, default=False)
