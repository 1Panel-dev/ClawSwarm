"""
这里定义第一阶段任务接口的输入输出结构。

设计目标：
1. 直接匹配 web-client 当前任务页需要的字段。
2. 尽量维持和前端现有 TaskView 一致的命名与语义。
3. 后续真接任务评论或更多状态时，优先在这层扩。
"""
from datetime import datetime

from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel


class TaskAssigneeRead(BaseModel):
    instance_id: int
    instance_name: str
    agent_id: int
    agent_name: str
    role_name: str | None


class TaskTimelineEntryRead(BaseModel):
    id: str
    type: str
    label: str
    content: str
    at: datetime


class TaskRead(TimestampedModel):
    id: str
    title: str
    description: str
    priority: str
    status: str
    source: str
    assignee: TaskAssigneeRead
    tags: list[str]
    started_at: datetime
    ended_at: datetime | None
    comment_count: int
    timeline: list[TaskTimelineEntryRead]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    priority: str = Field(default="medium")
    tags: list[str] = Field(default_factory=list)
    assignee_instance_id: int
    assignee_agent_id: int


class TaskActionPayload(BaseModel):
    comment: str | None = None


class TaskCommentCreate(BaseModel):
    comment: str = Field(min_length=1, max_length=4000)
    author_type: str = Field(default="agent")


class TaskCommentResult(BaseModel):
    task_id: str
    comment_count: int
    latest_entry: TaskTimelineEntryRead
