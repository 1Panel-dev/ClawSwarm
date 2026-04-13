"""这个模型表示项目管理里的单篇文档模板。

模板用于给项目新增普通文档时提供骨架内容：
1. 每条模板只描述一篇文档。
2. 内置模板与用户模板统一落在这张表里。
3. 是否系统内置通过 `is_builtin` 区分，便于排序与初始化。
"""
from uuid import uuid4

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class DocumentTemplate(Base, TimestampMixin):
    __tablename__ = "document_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(String(500), default="")
    category: Mapped[str] = mapped_column(String(50), default="其他")
    content: Mapped[str] = mapped_column(Text, default="")
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
