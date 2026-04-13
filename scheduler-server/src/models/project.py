"""这个模型表示项目管理模块中的项目主表。

当前版本只承载项目信息同步所需的最小字段：
1. 项目名称与描述。
2. 当前进度摘要。
3. 项目成员快照。
4. 创建时间与更新时间。
"""
from uuid import uuid4

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base
from src.models.base_mixins import TimestampMixin


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    current_progress: Mapped[str] = mapped_column(Text, default="")
    members_json: Mapped[str] = mapped_column(Text, default="[]")
