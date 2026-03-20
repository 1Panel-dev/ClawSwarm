from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel


class AgentCreate(BaseModel):
    agent_key: str = Field(min_length=1, max_length=120)
    display_name: str = Field(min_length=1, max_length=120)
    role_name: str | None = Field(default=None, max_length=120)
    enabled: bool = True


class AgentUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    role_name: str | None = Field(default=None, max_length=120)
    enabled: bool | None = None


class AgentRead(TimestampedModel):
    id: int
    instance_id: int
    agent_key: str
    display_name: str
    role_name: str | None
    enabled: bool
