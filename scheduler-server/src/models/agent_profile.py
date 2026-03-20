from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class AgentProfile(Base, TimestampMixin):
    __tablename__ = "agent_profiles"
    __table_args__ = (UniqueConstraint("instance_id", "agent_key", name="uq_agent_instance_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("openclaw_instances.id"), index=True)
    agent_key: Mapped[str] = mapped_column(String(120))
    display_name: Mapped[str] = mapped_column(String(120))
    role_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
