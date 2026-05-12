"""Hermes Endpoint 管理服务。"""

from __future__ import annotations

import json

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.integrations.hermes_client import hermes_client
from src.models.conversation import Conversation
from src.models.hermes_instance import HermesInstance
from src.models.runtime_target import RuntimeTarget
from src.schemas.common import dump_model
from src.schemas.hermes import (
    HermesConnectionTestRead,
    HermesInstanceCreate,
    HermesInstanceRead,
    HermesInstanceUpdate,
)
from src.services.runtime_target_service import sync_hermes_runtime_target


def serialize_hermes_instance(instance: HermesInstance) -> HermesInstanceRead:
    """整理 Hermes Endpoint 响应，避免泄漏 API Key。"""
    if instance.runtime_target_id is None or instance.cs_id is None:
        raise HTTPException(status_code=500, detail="Hermes endpoint runtime target is missing")
    capabilities = None
    if instance.capabilities_json:
        try:
            capabilities = json.loads(instance.capabilities_json)
        except ValueError:
            capabilities = None
    return HermesInstanceRead(
        id=instance.id,
        instance_key=instance.instance_key,
        runtime_target_id=instance.runtime_target_id,
        name=instance.name,
        cs_id=instance.cs_id,
        display_name=instance.display_name,
        role_name=instance.role_name,
        api_base_url=instance.api_base_url,
        api_key_configured=bool((instance.api_key or "").strip()),
        default_model=instance.default_model,
        status=instance.status,
        capabilities=capabilities,
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


def list_hermes_instances(db: Session) -> list[HermesInstanceRead]:
    items = list(db.scalars(select(HermesInstance).order_by(HermesInstance.id)))
    for item in items:
        sync_hermes_runtime_target(db=db, instance=item)
    db.commit()
    return [serialize_hermes_instance(item) for item in items]


def create_hermes_instance(*, db: Session, payload: HermesInstanceCreate) -> HermesInstanceRead:
    data = dump_model(payload)
    data["api_base_url"] = data["api_base_url"].rstrip("/")
    item = HermesInstance(**data)
    db.add(item)
    db.flush()
    sync_hermes_runtime_target(db=db, instance=item)
    db.commit()
    db.refresh(item)
    return serialize_hermes_instance(item)


def update_hermes_instance(*, db: Session, instance_id: int, payload: HermesInstanceUpdate) -> HermesInstanceRead:
    item = db.get(HermesInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="Hermes instance not found")

    updates = dump_model(payload, exclude_unset=True)
    for key, value in updates.items():
        if key == "api_base_url" and isinstance(value, str):
            value = value.rstrip("/")
        setattr(item, key, value)
    sync_hermes_runtime_target(db=db, instance=item)
    db.commit()
    db.refresh(item)
    return serialize_hermes_instance(item)


def set_hermes_instance_enabled(*, db: Session, instance_id: int, enabled: bool) -> HermesInstanceRead:
    item = db.get(HermesInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    item.status = "active" if enabled else "disabled"
    sync_hermes_runtime_target(db=db, instance=item)
    db.commit()
    db.refresh(item)
    return serialize_hermes_instance(item)


def delete_hermes_instance(*, db: Session, instance_id: int) -> None:
    item = db.get(HermesInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    if item.runtime_target_id:
        target = db.get(RuntimeTarget, item.runtime_target_id)
        if target:
            db.delete(target)
    db.delete(item)
    db.commit()


async def test_hermes_instance(*, db: Session, instance_id: int) -> HermesConnectionTestRead:
    item = db.get(HermesInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    capabilities = await fetch_hermes_capabilities(item)
    item.capabilities_json = json.dumps(capabilities, ensure_ascii=False)
    db.commit()
    return HermesConnectionTestRead(ok=True, capabilities=capabilities)


async def fetch_hermes_capabilities(instance: HermesInstance) -> dict:
    try:
        return await hermes_client.fetch_capabilities(instance=instance)
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Hermes timed out") from exc
    except (httpx.ConnectError, httpx.NetworkError, httpx.ProxyError) as exc:
        raise HTTPException(status_code=503, detail="Hermes instance is unreachable") from exc
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in {401, 403}:
            raise HTTPException(status_code=400, detail="Hermes authentication failed") from exc
        raise HTTPException(status_code=502, detail="Hermes request failed") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Hermes returned an invalid response") from exc


def create_or_get_hermes_conversation(*, db: Session, instance_id: int) -> Conversation:
    instance = db.get(HermesInstance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Hermes endpoint not found")
    if instance.status == "disabled":
        raise HTTPException(status_code=400, detail="Hermes endpoint is disabled")
    if not instance.runtime_target_id:
        sync_hermes_runtime_target(db=db, instance=instance)
        db.flush()
    existing = db.scalar(
        select(Conversation).where(
            Conversation.type == "direct",
            Conversation.direct_runtime_target_id == instance.runtime_target_id,
        )
    )
    if existing:
        return existing
    item = Conversation(
        type="direct",
        title=f"{instance.name} / {instance.display_name}",
        direct_runtime_target_id=instance.runtime_target_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
