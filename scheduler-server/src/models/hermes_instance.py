"""Hermes API Server 实例连接信息。"""

from uuid import uuid4

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class HermesInstance(Base, TimestampMixin):
    __tablename__ = "hermes_instances"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    instance_key: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120))
    api_base_url: Mapped[str] = mapped_column(String(500))
    api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    capabilities_json: Mapped[str | None] = mapped_column(Text, nullable=True)
