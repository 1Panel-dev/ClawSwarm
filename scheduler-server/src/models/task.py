"""
这个模型表示第一阶段的任务主表。

当前先覆盖最小可用字段：
1. 标题、描述、优先级、状态。
2. 指定执行的 OpenClaw 实例和 Agent。
3. 标签、评论/事件数量。
4. 开始时间与结束时间。

后续如果要扩任务评论、附件、更多状态，
优先沿着这个主表 + task_events 的结构往下扩，
避免推翻前端已经接好的任务页。
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    source: Mapped[str] = mapped_column(String(20), default="server")
    assignee_instance_id: Mapped[int] = mapped_column(ForeignKey("openclaw_instances.id"), index=True)
    assignee_agent_id: Mapped[int] = mapped_column(ForeignKey("agent_profiles.id"), index=True)
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
