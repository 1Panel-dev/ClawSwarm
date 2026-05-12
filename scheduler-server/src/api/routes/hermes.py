"""Hermes Endpoint 管理路由。"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.schemas.conversation import ConversationRead
from src.schemas.hermes import (
    HermesConnectionTestRead,
    HermesInstanceCreate,
    HermesInstanceRead,
    HermesInstanceUpdate,
)
from src.services.hermes_service import (
    create_hermes_instance,
    create_or_get_hermes_conversation,
    delete_hermes_instance,
    list_hermes_instances,
    set_hermes_instance_enabled,
    test_hermes_instance,
    update_hermes_instance,
)

router = APIRouter(prefix="/api/hermes", tags=["hermes"])


@router.get("/instances", response_model=list[HermesInstanceRead])
def list_instances(db: Session = Depends(db_session)) -> list[HermesInstanceRead]:
    return list_hermes_instances(db)


@router.post("/instances", response_model=HermesInstanceRead)
def create_instance(payload: HermesInstanceCreate, db: Session = Depends(db_session)) -> HermesInstanceRead:
    return create_hermes_instance(db=db, payload=payload)


@router.put("/instances/{instance_id}", response_model=HermesInstanceRead)
def update_instance(instance_id: int, payload: HermesInstanceUpdate, db: Session = Depends(db_session)) -> HermesInstanceRead:
    return update_hermes_instance(db=db, instance_id=instance_id, payload=payload)


@router.delete("/instances/{instance_id}", status_code=204)
def delete_instance(instance_id: int, db: Session = Depends(db_session)) -> None:
    delete_hermes_instance(db=db, instance_id=instance_id)


@router.post("/instances/{instance_id}/enable", response_model=HermesInstanceRead)
def enable_instance(instance_id: int, db: Session = Depends(db_session)) -> HermesInstanceRead:
    return set_hermes_instance_enabled(db=db, instance_id=instance_id, enabled=True)


@router.post("/instances/{instance_id}/disable", response_model=HermesInstanceRead)
def disable_instance(instance_id: int, db: Session = Depends(db_session)) -> HermesInstanceRead:
    return set_hermes_instance_enabled(db=db, instance_id=instance_id, enabled=False)


@router.post("/instances/{instance_id}/test", response_model=HermesConnectionTestRead)
async def test_instance(instance_id: int, db: Session = Depends(db_session)) -> HermesConnectionTestRead:
    return await test_hermes_instance(db=db, instance_id=instance_id)


@router.post("/instances/{instance_id}/capabilities", response_model=HermesConnectionTestRead)
async def sync_capabilities(instance_id: int, db: Session = Depends(db_session)) -> HermesConnectionTestRead:
    return await test_hermes_instance(db=db, instance_id=instance_id)


@router.post("/instances/{instance_id}/conversation", response_model=ConversationRead)
def open_instance_conversation(instance_id: int, db: Session = Depends(db_session)):
    return create_or_get_hermes_conversation(db=db, instance_id=instance_id)
