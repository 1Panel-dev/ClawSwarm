"""Hermes 实例和 Profile 管理服务。"""

from __future__ import annotations

import json

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.integrations.hermes_client import hermes_client
from src.models.conversation import Conversation
from src.models.hermes_instance import HermesInstance
from src.models.hermes_profile import HermesProfile
from src.models.runtime_target import RuntimeTarget
from src.schemas.common import dump_model
from src.schemas.hermes import (
    HermesConnectionTestRead,
    HermesInstanceCreate,
    HermesInstanceRead,
    HermesInstanceUpdate,
    HermesProfileCreate,
    HermesProfileRead,
    HermesProfileUpdate,
)
from src.services.runtime_target_service import sync_hermes_runtime_target


def serialize_hermes_instance(instance: HermesInstance) -> HermesInstanceRead:
    """整理 Hermes 实例响应，避免泄漏 API Key。"""
    capabilities = None
    if instance.capabilities_json:
        try:
            capabilities = json.loads(instance.capabilities_json)
        except ValueError:
            capabilities = None
    return HermesInstanceRead(
        id=instance.id,
        instance_key=instance.instance_key,
        name=instance.name,
        api_base_url=instance.api_base_url,
        api_key_configured=bool((instance.api_key or "").strip()),
        default_model=instance.default_model,
        status=instance.status,
        capabilities=capabilities,
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


def serialize_hermes_profile(profile: HermesProfile) -> HermesProfileRead:
    """整理 Hermes Profile 响应。"""
    if profile.runtime_target_id is None or profile.cs_id is None:
        raise HTTPException(status_code=500, detail="Hermes profile runtime target is missing")
    return HermesProfileRead(
        id=profile.id,
        instance_id=profile.instance_id,
        runtime_target_id=profile.runtime_target_id,
        profile_key=profile.profile_key,
        cs_id=profile.cs_id,
        display_name=profile.display_name,
        role_name=profile.role_name,
        model=profile.model,
        enabled=profile.enabled,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def list_hermes_instances(db: Session) -> list[HermesInstanceRead]:
    items = list(db.scalars(select(HermesInstance).order_by(HermesInstance.id)))
    return [serialize_hermes_instance(item) for item in items]


def create_hermes_instance(*, db: Session, payload: HermesInstanceCreate) -> HermesInstanceRead:
    data = dump_model(payload)
    data["api_base_url"] = data["api_base_url"].rstrip("/")
    item = HermesInstance(**data)
    db.add(item)
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
    db.commit()
    db.refresh(item)
    return serialize_hermes_instance(item)


def set_hermes_instance_enabled(*, db: Session, instance_id: int, enabled: bool) -> HermesInstanceRead:
    item = db.get(HermesInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    item.status = "active" if enabled else "disabled"
    db.commit()
    db.refresh(item)
    return serialize_hermes_instance(item)


def delete_hermes_instance(*, db: Session, instance_id: int) -> None:
    item = db.get(HermesInstance, instance_id)
    if not item:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    profiles = list(db.scalars(select(HermesProfile).where(HermesProfile.instance_id == instance_id)))
    for profile in profiles:
        if profile.runtime_target_id:
            target = db.get(RuntimeTarget, profile.runtime_target_id)
            if target:
                db.delete(target)
        db.delete(profile)
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


def list_hermes_profiles(*, db: Session, instance_id: int) -> list[HermesProfileRead]:
    instance = db.get(HermesInstance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    items = list(
        db.scalars(
            select(HermesProfile)
            .where(HermesProfile.instance_id == instance_id, HermesProfile.removed.is_(False))
            .order_by(HermesProfile.id)
        )
    )
    return [serialize_hermes_profile(item) for item in items]


def create_hermes_profile(*, db: Session, instance_id: int, payload: HermesProfileCreate) -> HermesProfileRead:
    instance = db.get(HermesInstance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    existing = db.scalar(
        select(HermesProfile).where(
            HermesProfile.instance_id == instance_id,
            HermesProfile.profile_key == payload.profile_key,
            HermesProfile.removed.is_(False),
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Hermes profile key already exists in this instance")
    profile = HermesProfile(
        instance_id=instance_id,
        profile_key=payload.profile_key,
        display_name=payload.display_name,
        role_name=payload.role_name,
        model=payload.model,
        enabled=payload.enabled,
    )
    db.add(profile)
    db.flush()
    sync_hermes_runtime_target(db=db, profile=profile)
    db.commit()
    db.refresh(profile)
    return serialize_hermes_profile(profile)


def update_hermes_profile(*, db: Session, profile_id: int, payload: HermesProfileUpdate) -> HermesProfileRead:
    profile = db.get(HermesProfile, profile_id)
    if not profile or profile.removed:
        raise HTTPException(status_code=404, detail="Hermes profile not found")
    updates = dump_model(payload, exclude_unset=True)
    for key, value in updates.items():
        setattr(profile, key, value)
    sync_hermes_runtime_target(db=db, profile=profile)
    db.commit()
    db.refresh(profile)
    return serialize_hermes_profile(profile)


def set_hermes_profile_enabled(*, db: Session, profile_id: int, enabled: bool) -> HermesProfileRead:
    profile = db.get(HermesProfile, profile_id)
    if not profile or profile.removed:
        raise HTTPException(status_code=404, detail="Hermes profile not found")
    profile.enabled = enabled
    sync_hermes_runtime_target(db=db, profile=profile)
    db.commit()
    db.refresh(profile)
    return serialize_hermes_profile(profile)


def delete_hermes_profile(*, db: Session, profile_id: int) -> None:
    profile = db.get(HermesProfile, profile_id)
    if not profile or profile.removed:
        raise HTTPException(status_code=404, detail="Hermes profile not found")
    profile.removed = True
    profile.enabled = False
    sync_hermes_runtime_target(db=db, profile=profile)
    db.commit()


def create_or_get_hermes_conversation(*, db: Session, profile_id: int) -> Conversation:
    profile = db.get(HermesProfile, profile_id)
    if not profile or profile.removed:
        raise HTTPException(status_code=404, detail="Hermes profile not found")
    instance = db.get(HermesInstance, profile.instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Hermes instance not found")
    if instance.status == "disabled" or not profile.enabled:
        raise HTTPException(status_code=400, detail="Hermes profile is disabled")
    if not profile.runtime_target_id:
        sync_hermes_runtime_target(db=db, profile=profile)
        db.flush()
    existing = db.scalar(
        select(Conversation).where(
            Conversation.type == "direct",
            Conversation.direct_runtime_target_id == profile.runtime_target_id,
        )
    )
    if existing:
        return existing
    item = Conversation(
        type="direct",
        title=f"{instance.name} / {profile.display_name}",
        direct_runtime_target_id=profile.runtime_target_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
