"""Hermes Runtime 管理路由。"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.schemas.conversation import ConversationRead
from src.schemas.hermes import (
    HermesConnectionTestRead,
    HermesInstanceCreate,
    HermesInstanceRead,
    HermesInstanceUpdate,
    HermesProfileCreate,
    HermesProfileRead,
    HermesProfileUpdate,
)
from src.services.hermes_service import (
    create_hermes_instance,
    create_hermes_profile,
    create_or_get_hermes_conversation,
    delete_hermes_instance,
    delete_hermes_profile,
    list_hermes_instances,
    list_hermes_profiles,
    set_hermes_instance_enabled,
    set_hermes_profile_enabled,
    test_hermes_instance,
    update_hermes_instance,
    update_hermes_profile,
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


@router.get("/instances/{instance_id}/profiles", response_model=list[HermesProfileRead])
def list_profiles(instance_id: int, db: Session = Depends(db_session)) -> list[HermesProfileRead]:
    return list_hermes_profiles(db=db, instance_id=instance_id)


@router.post("/instances/{instance_id}/profiles", response_model=HermesProfileRead)
def create_profile(instance_id: int, payload: HermesProfileCreate, db: Session = Depends(db_session)) -> HermesProfileRead:
    return create_hermes_profile(db=db, instance_id=instance_id, payload=payload)


@router.put("/profiles/{profile_id}", response_model=HermesProfileRead)
def update_profile(profile_id: int, payload: HermesProfileUpdate, db: Session = Depends(db_session)) -> HermesProfileRead:
    return update_hermes_profile(db=db, profile_id=profile_id, payload=payload)


@router.delete("/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: int, db: Session = Depends(db_session)) -> None:
    delete_hermes_profile(db=db, profile_id=profile_id)


@router.post("/profiles/{profile_id}/enable", response_model=HermesProfileRead)
def enable_profile(profile_id: int, db: Session = Depends(db_session)) -> HermesProfileRead:
    return set_hermes_profile_enabled(db=db, profile_id=profile_id, enabled=True)


@router.post("/profiles/{profile_id}/disable", response_model=HermesProfileRead)
def disable_profile(profile_id: int, db: Session = Depends(db_session)) -> HermesProfileRead:
    return set_hermes_profile_enabled(db=db, profile_id=profile_id, enabled=False)


@router.post("/profiles/{profile_id}/conversation", response_model=ConversationRead)
def open_profile_conversation(profile_id: int, db: Session = Depends(db_session)):
    return create_or_get_hermes_conversation(db=db, profile_id=profile_id)
