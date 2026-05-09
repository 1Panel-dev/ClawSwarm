"""Runtime Target 的创建和同步辅助函数。"""

from sqlalchemy.orm import Session

from src.models.runtime_target import RuntimeTarget


def format_hermes_cs_id(profile_id: int) -> str:
    """Hermes Profile 使用独立前缀，避免和 OpenClaw Agent 的 CSA 编号冲突。"""
    return f"CSH-{profile_id:04d}"


def sync_hermes_runtime_target(
    *,
    db: Session,
    profile,
) -> RuntimeTarget:
    """让 Hermes Profile 与统一 Runtime Target 保持一致。"""
    cs_id = (profile.cs_id or "").strip() or format_hermes_cs_id(profile.id)
    profile.cs_id = cs_id

    target = db.get(RuntimeTarget, profile.runtime_target_id) if profile.runtime_target_id else None
    if target is None:
        target = RuntimeTarget(
            runtime_type="hermes",
            runtime_instance_id=profile.instance_id,
            runtime_profile_id=profile.id,
            target_key=profile.profile_key,
            display_name=profile.display_name,
            role_name=profile.role_name,
            cs_id=cs_id,
            enabled=profile.enabled and not profile.removed,
        )
        db.add(target)
        db.flush()
        profile.runtime_target_id = target.id
    else:
        target.runtime_instance_id = profile.instance_id
        target.runtime_profile_id = profile.id
        target.target_key = profile.profile_key
        target.display_name = profile.display_name
        target.role_name = profile.role_name
        target.cs_id = cs_id
        target.enabled = profile.enabled and not profile.removed
    db.flush()
    return target
