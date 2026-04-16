"""这个模型表示项目下的单篇 Markdown 文档。

设计上不使用数据库外键：
1. `project_id` 仅作为软关联字段。
2. 核心文档与普通文档通过 `is_core` 区分。
3. 分类与排序信息直接放在文档记录里，方便前端分组展示。
"""
from uuid import uuid4

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class ProjectDocument(Base, TimestampMixin):
    __tablename__ = "project_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), default="其他")
    content: Mapped[str] = mapped_column(Text, default="")
    is_core: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
