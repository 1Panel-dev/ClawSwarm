"""本地 agent 记录与远端 profile 同步相关的 service。"""

from __future__ import annotations

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.integrations.channel_client import channel_client
from src.models.agent_profile import AgentProfile
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.agent import AgentCreate, AgentProfileRead, AgentRead, AgentUpdate, AgentWorkspaceFile
from src.schemas.common import dump_model, validate_orm
from src.services.agent_cleanup import delete_agent_private_conversations
from src.services.agent_cs_id import ensure_agent_cs_id
from src.services.openclaw_probe_service import fetch_channel_agents as fetch_channel_agents_from_openclaw

LEGACY_WORKSPACE_FILE_MAP = {
    "agents_md": "AGENTS.md",
    "tools_md": "TOOLS.md",
    "identity_md": "IDENTITY.md",
    "soul_md": "SOUL.md",
    "user_md": "USER.md",
    "memory_md": "MEMORY.md",
    "heartbeat_md": "HEARTBEAT.md",
}

WORKSPACE_FILE_TO_LEGACY_FIELD = {value: key for key, value in LEGACY_WORKSPACE_FILE_MAP.items()}


def _merge_workspace_files(*, files: list[AgentWorkspaceFile] | None, payload_data: dict[str, object]) -> list[dict[str, str | None]]:
    merged: dict[str, str | None] = {}
    for file in files or []:
        normalized_name = file.name.strip()
        if not normalized_name:
            continue
        merged[normalized_name] = file.content

    for field_name, filename in LEGACY_WORKSPACE_FILE_MAP.items():
        if field_name not in payload_data:
            continue
        merged[filename] = payload_data[field_name]  # type: ignore[assignment]

    return [{"name": name, "content": content} for name, content in merged.items()]


def _build_legacy_workspace_payload(files: list[dict[str, str | None]]) -> dict[str, str | None]:
    remote_payload: dict[str, str | None] = {}
    for file in files:
        field_name = WORKSPACE_FILE_TO_LEGACY_FIELD.get(str(file.get("name") or "").strip())
        if field_name is None:
            continue
        camel_name = "".join(part.capitalize() if index else part for index, part in enumerate(field_name.split("_")))
        remote_payload[camel_name] = file.get("content")
    return remote_payload


def _legacy_fields_from_remote_profile(profile: dict[str, object], files: list[AgentWorkspaceFile]) -> dict[str, str]:
    files_by_name = {item.name: item.content or "" for item in files}
    legacy_fields: dict[str, str] = {}
    for field_name, filename in LEGACY_WORKSPACE_FILE_MAP.items():
        camel_name = "".join(part.capitalize() if index else part for index, part in enumerate(field_name.split("_")))
        legacy_fields[field_name] = files_by_name.get(filename) or str(profile.get(camel_name) or "")
    return legacy_fields


def _workspace_files_from_remote_profile(profile: dict[str, object]) -> list[AgentWorkspaceFile]:
    raw_files = profile.get("files")
    files: list[AgentWorkspaceFile] = []
    if isinstance(raw_files, list):
        for item in raw_files:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            files.append(
                AgentWorkspaceFile(
                    name=name,
                    content=str(item.get("content") or ""),
                )
            )

    legacy_fields = _legacy_fields_from_remote_profile(profile, files)
    existing_names = {item.name for item in files}
    for field_name, filename in LEGACY_WORKSPACE_FILE_MAP.items():
        if filename in existing_names:
            continue
        files.append(AgentWorkspaceFile(name=filename, content=legacy_fields[field_name]))
    return files


def find_existing_agent_by_key(*, db: Session, instance_id: int, agent_key: str) -> AgentProfile | None:
    """查找某个实例下仍然存在于 OpenClaw 的同名 agent。"""
    normalized_key = agent_key.strip()
    if not normalized_key:
        return None
    return db.scalar(
        select(AgentProfile).where(
            AgentProfile.instance_id == instance_id,
            AgentProfile.agent_key == normalized_key,
            AgentProfile.removed_from_openclaw.is_(False),
        )
    )


def can_edit_agent_profile(agent: AgentProfile) -> bool:
    """默认把导入的 `main` agent 视为只读，除非它是 ClawSwarm 自己创建的。"""
    if agent.created_via_clawswarm:
        return True
    return agent.agent_key.strip().lower() != "main"


def upsert_instance_agent(
    db: Session,
    *,
    instance_id: int,
    agent_key: str,
    display_name: str,
    role_name: str | None = None,
    enabled: bool = True,
    created_via_clawswarm: bool | None = None,
) -> AgentProfile:
    """为指定实例创建或刷新一条本地 agent 记录。"""
    agent = db.scalar(
        select(AgentProfile).where(
            AgentProfile.instance_id == instance_id,
            AgentProfile.agent_key == agent_key,
        )
    )
    if agent is None:
        agent = AgentProfile(
            instance_id=instance_id,
            agent_key=agent_key,
            display_name=display_name,
            role_name=role_name,
            enabled=enabled,
            removed_from_openclaw=False,
            created_via_clawswarm=created_via_clawswarm or False,
        )
        db.add(agent)
    else:
        agent.display_name = display_name
        if role_name is not None:
            agent.role_name = role_name
        agent.removed_from_openclaw = False
        if created_via_clawswarm is not None:
            agent.created_via_clawswarm = created_via_clawswarm

    db.flush()
    ensure_agent_cs_id(agent)
    db.flush()
    return agent


def sync_instance_agents(db: Session, instance: OpenClawInstance, agents_payload: list[dict]) -> None:
    """把远端 agent 列表镜像到本地，并标记远端已消失的 agent。"""
    imported_keys: set[str] = set()
    for agent_data in agents_payload:
        agent_key = str(agent_data.get("id") or agent_data.get("openclawAgentRef") or "").strip()
        display_name = str(agent_data.get("name") or agent_key).strip()
        if not agent_key:
            continue

        imported_keys.add(agent_key)
        upsert_instance_agent(
            db,
            instance_id=instance.id,
            agent_key=agent_key,
            display_name=display_name,
            enabled=True,
        )

    if imported_keys:
        existing_agents = db.scalars(select(AgentProfile).where(AgentProfile.instance_id == instance.id)).all()
        for agent in existing_agents:
            if agent.agent_key not in imported_keys:
                delete_agent_private_conversations(db, agent_id=agent.id)
                agent.removed_from_openclaw = True

    db.flush()


def ensure_listable_agents(db: Session, instance_id: int) -> list[AgentProfile]:
    """返回某个实例下可见的 agent，并补齐缺失的 CS ID。"""
    agents = list(
        db.scalars(
            select(AgentProfile)
            .where(
                AgentProfile.instance_id == instance_id,
                AgentProfile.removed_from_openclaw.is_(False),
            )
            .order_by(AgentProfile.id)
        )
    )
    touched = False
    for agent in agents:
        if not (agent.cs_id or "").strip():
            ensure_agent_cs_id(agent)
            touched = True
    if touched:
        db.commit()
        for agent in agents:
            db.refresh(agent)
    return agents


async def create_agent_for_instance(*, db: Session, instance: OpenClawInstance, payload: AgentCreate) -> AgentProfile:
    """先在远端创建 agent，再同步到本地目录。"""
    existing_agent = find_existing_agent_by_key(db=db, instance_id=instance.id, agent_key=payload.agent_key)
    if existing_agent is not None:
        raise HTTPException(status_code=409, detail="agent key already exists in this instance")

    payload_data = dump_model(payload, exclude_unset=True)
    workspace_files = _merge_workspace_files(files=payload.files, payload_data=payload_data)
    remote_create_payload = {
        "agentKey": payload.agent_key,
        "displayName": payload.display_name,
    }
    if workspace_files:
        remote_create_payload["files"] = workspace_files
        remote_create_payload.update(_build_legacy_workspace_payload(workspace_files))

    try:
        created_remote_agent = await channel_client.create_agent(
            instance=instance,
            payload=remote_create_payload,
        )
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="OpenClaw timed out") from exc
    except (httpx.ConnectError, httpx.NetworkError, httpx.ProxyError) as exc:
        raise HTTPException(status_code=503, detail="OpenClaw instance is unreachable") from exc
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in {401, 403}:
            raise HTTPException(status_code=400, detail="OpenClaw instance signature mismatch") from exc
        if exc.response.status_code == 404:
            raise HTTPException(
                status_code=502,
                detail="clawswarm plugin is unavailable on the OpenClaw instance",
            ) from exc
        raise HTTPException(status_code=502, detail="OpenClaw request failed") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="OpenClaw returned an invalid response") from exc

    agent_key = str(created_remote_agent.get("id") or created_remote_agent.get("openclawAgentRef") or payload.agent_key).strip()
    display_name = str(created_remote_agent.get("name") or payload.display_name).strip() or payload.display_name

    agent = upsert_instance_agent(
        db,
        instance_id=instance.id,
        agent_key=agent_key,
        display_name=display_name,
        role_name=payload.role_name,
        enabled=payload.enabled,
        created_via_clawswarm=True,
    )

    try:
        agents_payload = fetch_channel_agents_from_openclaw(instance.channel_base_url.rstrip("/"))
    except HTTPException:
        agents_payload = []

    if agents_payload:
        if not any(str(item.get("id") or item.get("openclawAgentRef") or "").strip() == agent_key for item in agents_payload):
            agents_payload.append(created_remote_agent)
        sync_instance_agents(db, instance, agents_payload)

    if payload.role_name is not None:
        agent.role_name = payload.role_name

    db.commit()
    db.refresh(agent)
    return agent


async def load_agent_profile(*, db: Session, agent: AgentProfile) -> AgentProfileRead:
    """Fetch editable markdown profile fields from the remote OpenClaw agent."""
    if not can_edit_agent_profile(agent):
        raise HTTPException(status_code=403, detail="agent profile is read-only")
    if not (agent.cs_id or "").strip():
        ensure_agent_cs_id(agent)
        db.commit()
        db.refresh(agent)

    instance = db.get(OpenClawInstance, agent.instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="instance not found")

    try:
        profile = await channel_client.get_agent_profile(
            instance=instance,
            agent_key=agent.agent_key,
        )
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="OpenClaw timed out") from exc
    except (httpx.ConnectError, httpx.NetworkError, httpx.ProxyError) as exc:
        raise HTTPException(status_code=503, detail="OpenClaw instance is unreachable") from exc
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in {401, 403}:
            raise HTTPException(status_code=400, detail="OpenClaw instance signature mismatch") from exc
        if exc.response.status_code == 404:
            raise HTTPException(
                status_code=502,
                detail="clawswarm plugin is unavailable on the OpenClaw instance",
            ) from exc
        raise HTTPException(status_code=502, detail="OpenClaw request failed") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="OpenClaw returned an invalid response") from exc

    files = _workspace_files_from_remote_profile(profile)
    legacy_fields = _legacy_fields_from_remote_profile(profile, files)

    return AgentProfileRead(
        **dump_model(validate_orm(AgentRead, agent)),
        files=files,
        **legacy_fields,
    )


async def update_agent_profile(*, db: Session, agent: AgentProfile, payload: AgentUpdate) -> AgentProfile:
    """Push editable agent fields to OpenClaw and keep the local record in sync."""
    if not can_edit_agent_profile(agent):
        raise HTTPException(status_code=403, detail="agent profile is read-only")

    instance = db.get(OpenClawInstance, agent.instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="instance not found")

    payload_data = dump_model(payload, exclude_unset=True)
    workspace_files = _merge_workspace_files(files=payload.files, payload_data=payload_data)
    remote_payload: dict[str, object] = {}
    if payload.display_name is not None:
        remote_payload["displayName"] = payload.display_name
    if workspace_files:
        remote_payload["files"] = workspace_files
        remote_payload.update(_build_legacy_workspace_payload(workspace_files))

    if remote_payload:
        try:
            await channel_client.update_agent(
                instance=instance,
                agent_key=agent.agent_key,
                payload=remote_payload,
            )
        except httpx.TimeoutException as exc:
            raise HTTPException(status_code=504, detail="OpenClaw timed out") from exc
        except (httpx.ConnectError, httpx.NetworkError, httpx.ProxyError) as exc:
            raise HTTPException(status_code=503, detail="OpenClaw instance is unreachable") from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in {401, 403}:
                raise HTTPException(status_code=400, detail="OpenClaw instance signature mismatch") from exc
            if exc.response.status_code == 404:
                raise HTTPException(
                    status_code=502,
                    detail="clawswarm plugin is unavailable on the OpenClaw instance",
                ) from exc
            raise HTTPException(status_code=502, detail="OpenClaw request failed") from exc
        except ValueError as exc:
            raise HTTPException(status_code=502, detail="OpenClaw returned an invalid response") from exc

    for key, value in payload_data.items():
        if key in {"files", "agents_md", "identity_md", "soul_md", "tools_md", "user_md", "memory_md", "heartbeat_md"}:
            continue
        setattr(agent, key, value)
    if not (agent.cs_id or "").strip():
        ensure_agent_cs_id(agent)
    db.commit()
    db.refresh(agent)
    return agent
