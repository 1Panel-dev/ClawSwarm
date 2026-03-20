from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class OpenClawInstance(Base, TimestampMixin):
    __tablename__ = "openclaw_instances"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    channel_base_url: Mapped[str] = mapped_column(String(500))
    channel_account_id: Mapped[str] = mapped_column(String(120), default="default")
    channel_signing_secret: Mapped[str] = mapped_column(String(255))
    callback_token: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="active")
