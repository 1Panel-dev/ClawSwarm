"""
第一阶段联调用的演示数据脚本。
它会向本地 SQLite 写入一个可直接使用的实例、几个 Agent 和一个群组。
"""
from __future__ import annotations

from sqlalchemy import select

from src.core.db import SessionLocal
from src.models.agent_profile import AgentProfile
from src.models.chat_group import ChatGroup
from src.models.chat_group_member import ChatGroupMember
from src.models.openclaw_instance import OpenClawInstance


def ensure_instance(db) -> OpenClawInstance:
    instance = db.scalar(select(OpenClawInstance).where(OpenClawInstance.name == "Local OpenClaw"))
    if instance:
        return instance

    instance = OpenClawInstance(
        name="Local OpenClaw",
        channel_base_url="http://127.0.0.1:18789",
        channel_account_id="default",
        channel_signing_secret="1234567890abcdef",
        callback_token="callback-token-local",
        status="active",
    )
    db.add(instance)
    db.flush()
    return instance


def ensure_agent(db, *, instance_id: int, agent_key: str, display_name: str, role_name: str) -> AgentProfile:
    existing = db.scalar(
        select(AgentProfile).where(
            AgentProfile.instance_id == instance_id,
            AgentProfile.agent_key == agent_key,
        )
    )
    if existing:
        return existing

    agent = AgentProfile(
        instance_id=instance_id,
        agent_key=agent_key,
        display_name=display_name,
        role_name=role_name,
        enabled=True,
    )
    db.add(agent)
    db.flush()
    return agent


def ensure_group(db, *, name: str) -> ChatGroup:
    existing = db.scalar(select(ChatGroup).where(ChatGroup.name == name))
    if existing:
        return existing

    group = ChatGroup(name=name, description="第一阶段联调用演示群组")
    db.add(group)
    db.flush()
    return group


def ensure_group_member(db, *, group_id: int, instance_id: int, agent_id: int) -> None:
    existing = db.scalar(
        select(ChatGroupMember).where(
            ChatGroupMember.group_id == group_id,
            ChatGroupMember.agent_id == agent_id,
        )
    )
    if existing:
        return
    db.add(ChatGroupMember(group_id=group_id, instance_id=instance_id, agent_id=agent_id))


def main() -> None:
    db = SessionLocal()
    try:
        instance = ensure_instance(db)
        pm = ensure_agent(db, instance_id=instance.id, agent_key="pm", display_name="PM", role_name="产品经理")
        rd = ensure_agent(db, instance_id=instance.id, agent_key="rd", display_name="RD", role_name="研发工程师")
        qa = ensure_agent(db, instance_id=instance.id, agent_key="qa", display_name="QA", role_name="测试工程师")
        group = ensure_group(db, name="默认项目群")
        for agent in (pm, rd, qa):
            ensure_group_member(db, group_id=group.id, instance_id=instance.id, agent_id=agent.id)

        db.commit()
        print("seed complete")
        print(f"instance_id={instance.id}")
        print(f"group_id={group.id}")
        print(f"agents={[pm.id, rd.id, qa.id]}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
