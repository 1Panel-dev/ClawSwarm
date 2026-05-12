"""
这里定义双 Agent 对话的独立 schema。

第一阶段先把最小控制面收好：
1. 创建对话。
2. 查看状态。
3. 暂停 / 恢复 / 停止。
4. 用户中途插话。
"""
from datetime import datetime

from pydantic import BaseModel, Field, root_validator

from src.schemas.common import TimestampedModel


class AgentDialogueCreate(BaseModel):
    source_agent_id: int | None = None
    target_agent_id: int | None = None
    source_runtime_target_id: int | None = None
    target_runtime_target_id: int | None = None
    topic: str = Field(min_length=1)
    window_seconds: int = Field(default=300, ge=60, le=3600)
    soft_message_limit: int = Field(default=12, ge=2, le=100)
    hard_message_limit: int = Field(default=20, ge=3, le=200)

    @root_validator(skip_on_failure=True)
    def validate_thresholds(cls, values: dict) -> dict:
        soft_message_limit = values.get("soft_message_limit")
        hard_message_limit = values.get("hard_message_limit")
        if soft_message_limit is not None and hard_message_limit is not None and soft_message_limit >= hard_message_limit:
            raise ValueError("soft_message_limit must be less than hard_message_limit")
        has_agent_pair = values.get("source_agent_id") is not None and values.get("target_agent_id") is not None
        has_runtime_pair = values.get("source_runtime_target_id") is not None and values.get("target_runtime_target_id") is not None
        if not has_agent_pair and not has_runtime_pair:
            raise ValueError("source/target agent pair or runtime target pair is required")
        return values


class AgentDialogueRead(TimestampedModel):
    id: int
    conversation_id: int
    source_agent_id: int | None
    source_runtime_target_id: int | None = None
    source_agent_cs_id: str
    source_agent_display_name: str
    source_agent_instance_name: str | None = None
    target_agent_id: int | None
    target_runtime_target_id: int | None = None
    target_agent_cs_id: str
    target_agent_display_name: str
    target_agent_instance_name: str | None = None
    topic: str
    status: str
    initiator_type: str
    initiator_agent_id: int | None
    window_seconds: int
    soft_message_limit: int
    hard_message_limit: int
    soft_limit_warned_at: datetime | None
    last_speaker_agent_id: int | None
    last_speaker_runtime_target_id: int | None = None
    last_speaker_agent_cs_id: str | None
    last_speaker_agent_display_name: str | None
    next_agent_id: int | None
    next_agent_cs_id: str | None
    next_agent_display_name: str | None


class AgentDialogueControl(BaseModel):
    action: str


class AgentDialogueMessageCreate(BaseModel):
    content: str = Field(min_length=1)
