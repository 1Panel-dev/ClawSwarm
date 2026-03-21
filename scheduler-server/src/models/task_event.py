"""
这个模型表示任务时间线中的一条事件。

第一阶段先把：
1. 系统事件
2. 用户评论
3. Agent 更新

统一收在这里，前端详情抽屉就可以直接渲染时间线。
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


class TaskEvent(Base):
    __tablename__ = "task_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), index=True)
    type: Mapped[str] = mapped_column(String(20))
    label: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
