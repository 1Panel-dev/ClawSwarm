"""
这个文件负责 OpenClaw 实例管理。

第一阶段里，一个实例代表一套可调用的 claw-team channel：
1. 保存 channel 地址。
2. 保存 accountId。
3. 保存调度中心到 channel 的签名密钥。
4. 保存 channel 回调调度中心时使用的 callback token。
"""
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
    # 这里保存的是“调度中心怎么找到某个 OpenClaw 实例上的 channel”所需的最小信息。
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
    # 第一阶段先用 status 字段做软开关，不直接删配置。
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
