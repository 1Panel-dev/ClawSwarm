from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel


class InstanceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    channel_base_url: str = Field(min_length=1, max_length=500)
    channel_account_id: str = Field(default="default", min_length=1, max_length=120)
    channel_signing_secret: str = Field(min_length=16, max_length=255)
    callback_token: str = Field(min_length=8, max_length=255)
    status: str = Field(default="active", pattern="^(active|disabled|offline)$")


class InstanceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    channel_base_url: str | None = Field(default=None, min_length=1, max_length=500)
    channel_account_id: str | None = Field(default=None, min_length=1, max_length=120)
    channel_signing_secret: str | None = Field(default=None, min_length=16, max_length=255)
    callback_token: str | None = Field(default=None, min_length=8, max_length=255)
    status: str | None = Field(default=None, pattern="^(active|disabled|offline)$")


class InstanceRead(TimestampedModel):
    id: int
    name: str
    channel_base_url: str
    channel_account_id: str
    status: str
