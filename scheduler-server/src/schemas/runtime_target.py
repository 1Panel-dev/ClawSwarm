"""Runtime Target 对外读取结构。"""

from pydantic import BaseModel


class RuntimeTargetRead(BaseModel):
    id: int
    runtime_type: str
    runtime_instance_id: int
    runtime_profile_id: int
    target_key: str
    display_name: str
    role_name: str | None
    cs_id: str
    enabled: bool
    instance_name: str
