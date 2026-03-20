from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


class MessageCallbackEvent(Base):
    __tablename__ = "message_callback_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dispatch_id: Mapped[str] = mapped_column(ForeignKey("message_dispatches.id"), index=True)
    event_id: Mapped[str] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(32))
    payload_json: Mapped[dict] = mapped_column(JSON)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
