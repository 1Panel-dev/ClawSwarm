"""Hermes 实例、Profile 与连接测试相关 schema。"""

from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel


class HermesInstanceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    api_base_url: str = Field(min_length=1, max_length=500)
    api_key: str | None = Field(default=None, max_length=255)
    default_model: str | None = Field(default=None, max_length=120)
    status: str = Field(default="active", pattern="^(active|disabled|offline)$")


class HermesInstanceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    api_base_url: str | None = Field(default=None, min_length=1, max_length=500)
    api_key: str | None = Field(default=None, max_length=255)
    default_model: str | None = Field(default=None, max_length=120)
    status: str | None = Field(default=None, pattern="^(active|disabled|offline)$")


class HermesInstanceRead(TimestampedModel):
    id: int
    instance_key: str
    name: str
    api_base_url: str
    api_key_configured: bool
    default_model: str | None
    status: str
    capabilities: dict | None = None


class HermesProfileCreate(BaseModel):
    profile_key: str = Field(min_length=1, max_length=120)
    display_name: str = Field(min_length=1, max_length=120)
    role_name: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    enabled: bool = True


class HermesProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    role_name: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    enabled: bool | None = None


class HermesProfileRead(TimestampedModel):
    id: int
    instance_id: int
    runtime_target_id: int
    profile_key: str
    cs_id: str
    display_name: str
    role_name: str | None
    model: str | None
    enabled: bool


class HermesConnectionTestRead(BaseModel):
    ok: bool
    capabilities: dict | None = None
