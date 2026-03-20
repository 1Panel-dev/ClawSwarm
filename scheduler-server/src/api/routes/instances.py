from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.common import dump_model
from src.schemas.instance import InstanceCreate, InstanceRead, InstanceUpdate

router = APIRouter(prefix="/api/instances", tags=["instances"])


@router.get("", response_model=list[InstanceRead])
def list_instances(db: Session = Depends(db_session)) -> list[OpenClawInstance]:
    return list(db.scalars(select(OpenClawInstance).order_by(OpenClawInstance.id)))


@router.post("", response_model=InstanceRead)
def create_instance(payload: InstanceCreate, db: Session = Depends(db_session)) -> OpenClawInstance:
    item = OpenClawInstance(**dump_model(payload))
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{instance_id}", response_model=InstanceRead)
def update_instance(instance_id: int, payload: InstanceUpdate, db: Session = Depends(db_session)) -> OpenClawInstance:
    item = db.get(OpenClawInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="instance not found")
    for key, value in dump_model(payload, exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.post("/{instance_id}/enable", response_model=InstanceRead)
def enable_instance(instance_id: int, db: Session = Depends(db_session)) -> OpenClawInstance:
    item = db.get(OpenClawInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="instance not found")
    item.status = "active"
    db.commit()
    db.refresh(item)
    return item


@router.post("/{instance_id}/disable", response_model=InstanceRead)
def disable_instance(instance_id: int, db: Session = Depends(db_session)) -> OpenClawInstance:
    item = db.get(OpenClawInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="instance not found")
    item.status = "disabled"
    db.commit()
    db.refresh(item)
    return item
