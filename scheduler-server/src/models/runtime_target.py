"""统一表示 ClawSwarm 中可对话的 Runtime 目标。"""

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class RuntimeTarget(Base, TimestampMixin):
    __tablename__ = "runtime_targets"
    __table_args__ = (
        UniqueConstraint("runtime_type", "runtime_instance_id", "runtime_profile_id", name="uq_runtime_target_profile"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    runtime_type: Mapped[str] = mapped_column(String(32), index=True)
    runtime_instance_id: Mapped[int] = mapped_column(index=True)
    runtime_profile_id: Mapped[int] = mapped_column(index=True)
    target_key: Mapped[str] = mapped_column(String(120), index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    role_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cs_id: Mapped[str] = mapped_column(String(32), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
