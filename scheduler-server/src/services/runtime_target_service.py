"""Runtime Target 的创建和同步辅助函数。"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.agent_profile import AgentProfile
from src.models.hermes_instance import HermesInstance
from src.models.openclaw_instance import OpenClawInstance
from src.models.runtime_target import RuntimeTarget
from src.services.agent_cs_id import ensure_agent_cs_id


def format_hermes_cs_id(instance_id: int) -> str:
    """Hermes Endpoint 使用独立前缀，避免和 OpenClaw Agent 的 CSA 编号冲突。"""
    return f"CSH-{instance_id:04d}"


def sync_hermes_runtime_target(
    *,
    db: Session,
    instance: HermesInstance,
) -> RuntimeTarget:
    """让 Hermes Endpoint 与统一 Runtime Target 保持一致。"""
    cs_id = (instance.cs_id or "").strip() or format_hermes_cs_id(instance.id)
    instance.cs_id = cs_id

    target = db.get(RuntimeTarget, instance.runtime_target_id) if instance.runtime_target_id else None
    if target is None:
        target = RuntimeTarget(
            runtime_type="hermes",
            runtime_instance_id=instance.id,
            runtime_profile_id=instance.id,
            target_key=instance.instance_key,
            display_name=instance.display_name,
            role_name=instance.role_name,
            cs_id=cs_id,
            enabled=instance.status != "disabled",
        )
        db.add(target)
        db.flush()
        instance.runtime_target_id = target.id
    else:
        target.runtime_instance_id = instance.id
        target.runtime_profile_id = instance.id
        target.target_key = instance.instance_key
        target.display_name = instance.display_name
        target.role_name = instance.role_name
        target.cs_id = cs_id
        target.enabled = instance.status != "disabled"
    db.flush()
    return target


def sync_openclaw_runtime_target(
    *,
    db: Session,
    agent: AgentProfile,
) -> RuntimeTarget:
    """让 OpenClaw Agent 与统一 Runtime Target 保持一致。"""
    cs_id = ensure_agent_cs_id(agent)
    target = db.scalar(
        select(RuntimeTarget).where(
            RuntimeTarget.runtime_type == "openclaw",
            RuntimeTarget.runtime_instance_id == agent.instance_id,
            RuntimeTarget.runtime_profile_id == agent.id,
        )
    )
    if target is None:
        target = RuntimeTarget(
            runtime_type="openclaw",
            runtime_instance_id=agent.instance_id,
            runtime_profile_id=agent.id,
            target_key=agent.agent_key,
            display_name=agent.display_name,
            role_name=agent.role_name,
            cs_id=cs_id,
            enabled=agent.enabled and not agent.removed_from_openclaw,
        )
        db.add(target)
    else:
        target.target_key = agent.agent_key
        target.display_name = agent.display_name
        target.role_name = agent.role_name
        target.cs_id = cs_id
        target.enabled = agent.enabled and not agent.removed_from_openclaw
    db.flush()
    return target


def ensure_openclaw_runtime_targets(db: Session) -> None:
    """为当前可见的 OpenClaw Agent 补齐 Runtime Target。"""
    agents = list(db.scalars(select(AgentProfile).where(AgentProfile.removed_from_openclaw.is_(False)).order_by(AgentProfile.id)))
    for agent in agents:
        sync_openclaw_runtime_target(db=db, agent=agent)
    db.flush()


def ensure_hermes_runtime_targets(db: Session) -> None:
    """为当前 Hermes Endpoint 补齐 Runtime Target。"""
    instances = list(db.scalars(select(HermesInstance).order_by(HermesInstance.id)))
    for instance in instances:
        sync_hermes_runtime_target(db=db, instance=instance)
    db.flush()


def get_runtime_target_or_404(db: Session, target_id: int) -> RuntimeTarget:
    """读取 Runtime Target，不存在时返回 404。"""
    target = db.get(RuntimeTarget, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="runtime target not found")
    return target


def resolve_openclaw_agent_from_runtime_target(db: Session, target: RuntimeTarget) -> AgentProfile:
    """当前阶段只允许 OpenClaw Runtime Target 进入旧 Agent Dialogue 调度链路。"""
    if target.runtime_type != "openclaw":
        raise HTTPException(status_code=400, detail="runtime target dialogue dispatch is not ready for this runtime type")
    agent = db.get(AgentProfile, target.runtime_profile_id)
    if not agent or agent.removed_from_openclaw:
        raise HTTPException(status_code=404, detail="runtime target agent not found")
    if not agent.enabled or not target.enabled:
        raise HTTPException(status_code=400, detail="runtime target is disabled")
    return agent


def ensure_runtime_target_dispatchable(db: Session, target: RuntimeTarget) -> RuntimeTarget:
    """确认 Runtime Target 当前存在且可参与调度。"""
    if not target.enabled:
        raise HTTPException(status_code=400, detail="runtime target is disabled")
    if target.runtime_type == "openclaw":
        resolve_openclaw_agent_from_runtime_target(db, target)
        return target
    if target.runtime_type == "hermes":
        instance = db.get(HermesInstance, target.runtime_instance_id)
        if not instance:
            raise HTTPException(status_code=404, detail="Hermes endpoint not found")
        if instance.status == "disabled":
            raise HTTPException(status_code=400, detail="runtime target is disabled")
        sync_hermes_runtime_target(db=db, instance=instance)
        return target
    raise HTTPException(status_code=400, detail="unsupported runtime target type")


def list_runtime_targets(db: Session) -> list[dict[str, object]]:
    """返回当前可用于选择的 Runtime Target。"""
    ensure_openclaw_runtime_targets(db)
    ensure_hermes_runtime_targets(db)

    targets = list(db.scalars(select(RuntimeTarget).where(RuntimeTarget.enabled.is_(True)).order_by(RuntimeTarget.runtime_type, RuntimeTarget.id)))
    rows: list[dict[str, object]] = []
    for target in targets:
        instance_name: str | None = None
        if target.runtime_type == "openclaw":
            instance = db.get(OpenClawInstance, target.runtime_instance_id)
            agent = db.get(AgentProfile, target.runtime_profile_id)
            if not instance or instance.status == "disabled" or not agent or not agent.enabled or agent.removed_from_openclaw:
                target.enabled = False
                continue
            sync_openclaw_runtime_target(db=db, agent=agent)
            instance_name = instance.name
        elif target.runtime_type == "hermes":
            instance = db.get(HermesInstance, target.runtime_instance_id)
            if not instance or instance.status == "disabled":
                target.enabled = False
                continue
            sync_hermes_runtime_target(db=db, instance=instance)
            instance_name = instance.name
        else:
            continue

        rows.append(
            {
                "id": target.id,
                "runtime_type": target.runtime_type,
                "runtime_instance_id": target.runtime_instance_id,
                "runtime_profile_id": target.runtime_profile_id,
                "target_key": target.target_key,
                "display_name": target.display_name,
                "role_name": target.role_name,
                "cs_id": target.cs_id,
                "enabled": target.enabled,
                "instance_name": instance_name,
            }
        )
    db.commit()
    return rows
