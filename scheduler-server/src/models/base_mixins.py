"""
这里放模型共用的基础 mixin。

目前第一阶段只抽了 TimestampMixin，
统一给主要业务表补 created_at / updated_at。
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    # created_at / updated_at 同时兼容数据库默认值和 Python 侧默认值，
    # 这样本地 SQLite 与后续别的数据库都更稳定。
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
