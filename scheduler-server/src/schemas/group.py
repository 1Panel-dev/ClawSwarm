from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class GroupRead(TimestampedModel):
    id: int
    name: str
    description: str | None


class GroupMemberAddItem(BaseModel):
    instance_id: int
    agent_id: int


class GroupMemberAddRequest(BaseModel):
    members: list[GroupMemberAddItem]


class GroupMemberRead(BaseModel):
    id: int
    group_id: int
    instance_id: int
    agent_id: int
    joined_at: str
    agent_key: str
    display_name: str
    role_name: str | None
    instance_name: str


class GroupDetail(BaseModel):
    id: int
    name: str
    description: str | None
    members: list[GroupMemberRead]
