"""
这个文件负责实例下的 Agent 管理。

第一阶段里，Agent 主要承担通讯录和路由目标的作用：
1. 前端通讯录展示这些 agent。
2. 单聊会话会直接绑定到某个 agent。
3. 群组成员也引用这里的 agent 记录。
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.integrations.channel_client import channel_client
from src.models.agent_profile import AgentProfile
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.common import dump_model
from src.schemas.agent import AgentCreate, AgentRead, AgentUpdate

router = APIRouter(prefix="/api", tags=["agents"])


def fetch_channel_agents(instance: OpenClawInstance) -> list[dict]:
    base_url = instance.channel_base_url.rstrip("/")
    try:
        with httpx.Client(timeout=10.0, verify=False) as client:
            response = client.get(f"{base_url}/claw-team/v1/agents")
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"failed to sync agents: {exc}") from exc

    payload = response.json()
    if not isinstance(payload, list):
        raise HTTPException(status_code=400, detail="invalid agents response")
    return [item for item in payload if isinstance(item, dict)]


def sync_instance_agents(db: Session, instance: OpenClawInstance, agents_payload: list[dict]) -> None:
    imported_keys: set[str] = set()
    for agent_data in agents_payload:
        agent_key = str(agent_data.get("id") or agent_data.get("openclawAgentRef") or "").strip()
        display_name = str(agent_data.get("name") or agent_key).strip()
        if not agent_key:
            continue

        imported_keys.add(agent_key)
        agent = db.scalar(
            select(AgentProfile).where(
                AgentProfile.instance_id == instance.id,
                AgentProfile.agent_key == agent_key,
            )
        )
        if agent is None:
            agent = AgentProfile(
                instance_id=instance.id,
                agent_key=agent_key,
                display_name=display_name,
                role_name=None,
                enabled=True,
            )
            db.add(agent)
        else:
            agent.display_name = display_name
            agent.enabled = True

    if imported_keys:
        existing_agents = db.scalars(select(AgentProfile).where(AgentProfile.instance_id == instance.id)).all()
        for agent in existing_agents:
            if agent.agent_key not in imported_keys:
                agent.enabled = False

    db.flush()


@router.get("/instances/{instance_id}/agents", response_model=list[AgentRead])
def list_agents(instance_id: int, db: Session = Depends(db_session)) -> list[AgentProfile]:
    return list(
        db.scalars(select(AgentProfile).where(AgentProfile.instance_id == instance_id).order_by(AgentProfile.id))
    )


@router.post("/instances/{instance_id}/agents", response_model=AgentRead)
async def create_agent(instance_id: int, payload: AgentCreate, db: Session = Depends(db_session)) -> AgentProfile:
    instance = db.get(OpenClawInstance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="instance not found")

    try:
        await channel_client.create_agent(
            instance=instance,
            payload={
                "agentKey": payload.agent_key,
                "displayName": payload.display_name,
            },
        )
    except httpx.HTTPError as exc:
        response = getattr(exc, "response", None)
        detail = response.text if response is not None else str(exc)
        raise HTTPException(status_code=400, detail=f"failed to create real agent: {detail}") from exc

    sync_instance_agents(db, instance, fetch_channel_agents(instance))
    db.commit()
    agent = db.scalar(
        select(AgentProfile).where(
            AgentProfile.instance_id == instance_id,
            AgentProfile.agent_key == payload.agent_key,
        )
    )
    if not agent:
        raise HTTPException(status_code=500, detail="agent created remotely but sync failed")

    if payload.role_name is not None:
        agent.role_name = payload.role_name
        db.commit()

    db.refresh(agent)
    return agent


@router.put("/agents/{agent_id}", response_model=AgentRead)
def update_agent(agent_id: int, payload: AgentUpdate, db: Session = Depends(db_session)) -> AgentProfile:
    agent = db.get(AgentProfile, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="agent not found")
    for key, value in dump_model(payload, exclude_unset=True).items():
        setattr(agent, key, value)
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/agents/{agent_id}/enable", response_model=AgentRead)
def enable_agent(agent_id: int, db: Session = Depends(db_session)) -> AgentProfile:
    # 第一阶段先用 enabled 做逻辑开关，避免直接删除导致群组成员和历史消息失联。
    agent = db.get(AgentProfile, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="agent not found")
    agent.enabled = True
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/agents/{agent_id}/disable", response_model=AgentRead)
def disable_agent(agent_id: int, db: Session = Depends(db_session)) -> AgentProfile:
    agent = db.get(AgentProfile, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="agent not found")
    agent.enabled = False
    db.commit()
    db.refresh(agent)
    return agent
