"""这里定义项目管理模块的接口输入输出结构。

当前范围只覆盖：
1. 项目基础信息。
2. 项目文档。
3. 人类只读页与 Agent 只读接口需要的最小响应。
"""
from datetime import datetime

from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel


class ProjectMember(BaseModel):
    agent_key: str = Field(min_length=1, max_length=120)
    cs_id: str = Field(min_length=1, max_length=32)
    openclaw: str = Field(min_length=1, max_length=120)
    role: str = Field(default="", max_length=120)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=20000)
    current_progress: str = Field(default="", max_length=20000)
    members: list[ProjectMember] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=20000)
    current_progress: str = Field(default="", max_length=20000)
    members: list[ProjectMember] = Field(default_factory=list)


class ProjectRead(TimestampedModel):
    id: str
    name: str
    description: str
    current_progress: str
    members: list[ProjectMember] = Field(default_factory=list)


class ProjectDocumentRead(TimestampedModel):
    id: str
    project_id: str
    name: str
    category: str
    content: str
    is_core: bool
    sort_order: int


class ProjectDetailRead(ProjectRead):
    documents: list[ProjectDocumentRead] = Field(default_factory=list)


class ProjectDocumentCreate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=50)
    content: str | None = Field(default=None, max_length=30000)


class ProjectDocumentUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(max_length=50)
    content: str = Field(max_length=30000)


class AgentReadableProjectDocumentRead(BaseModel):
    projectId: str
    documentId: str
    name: str
    category: str
    content: str
    updatedAt: datetime
