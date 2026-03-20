"""
这个模型表示调度中心自己维护的群组。

注意：
群组本身只保存元信息；
群成员关系放在 chat_group_members 表中。
"""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class ChatGroup(Base, TimestampMixin):
    __tablename__ = "chat_groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
