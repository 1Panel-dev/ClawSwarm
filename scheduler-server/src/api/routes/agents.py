from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.models.agent_profile import AgentProfile
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.common import dump_model
from src.schemas.agent import AgentCreate, AgentRead, AgentUpdate

router = APIRouter(prefix="/api", tags=["agents"])


@router.get("/instances/{instance_id}/agents", response_model=list[AgentRead])
def list_agents(instance_id: int, db: Session = Depends(db_session)) -> list[AgentProfile]:
    return list(
        db.scalars(select(AgentProfile).where(AgentProfile.instance_id == instance_id).order_by(AgentProfile.id))
    )


@router.post("/instances/{instance_id}/agents", response_model=AgentRead)
def create_agent(instance_id: int, payload: AgentCreate, db: Session = Depends(db_session)) -> AgentProfile:
    instance = db.get(OpenClawInstance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="instance not found")
    agent = AgentProfile(instance_id=instance_id, **dump_model(payload))
    db.add(agent)
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
