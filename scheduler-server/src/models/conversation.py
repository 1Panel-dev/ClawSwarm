"""
这个模型表示一个聊天会话。

第一阶段只支持两种：
1. direct：直接绑定到一个 instance + agent。
2. group：绑定到一个 group。
"""
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # 取值目前只有 direct / group。
    type: Mapped[str] = mapped_column(String(20))
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("chat_groups.id"), nullable=True, index=True)
    direct_instance_id: Mapped[int | None] = mapped_column(ForeignKey("openclaw_instances.id"), nullable=True, index=True)
    direct_agent_id: Mapped[int | None] = mapped_column(ForeignKey("agent_profiles.id"), nullable=True, index=True)
