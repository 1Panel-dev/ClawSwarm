"""ClawSwarm 侧维护的 Hermes Profile。"""

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class HermesProfile(Base, TimestampMixin):
    __tablename__ = "hermes_profiles"
    __table_args__ = (UniqueConstraint("instance_id", "profile_key", name="uq_hermes_profile_instance_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(index=True)
    runtime_target_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    profile_key: Mapped[str] = mapped_column(String(120))
    cs_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    role_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    removed: Mapped[bool] = mapped_column(Boolean, default=False)
