"""Runtime Target 选择器接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.schemas.runtime_target import RuntimeTargetRead
from src.services.runtime_target_service import list_runtime_targets

router = APIRouter(prefix="/api/runtime-targets", tags=["runtime-targets"])


@router.get("", response_model=list[RuntimeTargetRead])
def list_targets(db: Session = Depends(db_session)) -> list[RuntimeTargetRead]:
    return [RuntimeTargetRead(**item) for item in list_runtime_targets(db)]
