from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.models.agent_profile import AgentProfile
from src.models.chat_group import ChatGroup
from src.models.chat_group_member import ChatGroupMember
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.address_book import (
    AddressBookAgent,
    AddressBookGroup,
    AddressBookGroupMember,
    AddressBookInstance,
    AddressBookResponse,
)

router = APIRouter(prefix="/api", tags=["address-book"])


@router.get("/address-book", response_model=AddressBookResponse)
def get_address_book(db: Session = Depends(db_session)) -> AddressBookResponse:
    instances = list(db.scalars(select(OpenClawInstance).order_by(OpenClawInstance.id)))
    agents = list(db.scalars(select(AgentProfile).order_by(AgentProfile.instance_id, AgentProfile.id)))
    groups = list(db.scalars(select(ChatGroup).order_by(ChatGroup.id)))
    members = list(db.scalars(select(ChatGroupMember).order_by(ChatGroupMember.group_id, ChatGroupMember.id)))

    agent_map = {agent.id: agent for agent in agents}
    instance_map = {instance.id: instance for instance in instances}

    grouped_agents: dict[int, list[AddressBookAgent]] = {}
    for agent in agents:
        grouped_agents.setdefault(agent.instance_id, []).append(
            AddressBookAgent(
                id=agent.id,
                agent_key=agent.agent_key,
                display_name=agent.display_name,
                role_name=agent.role_name,
                enabled=agent.enabled,
            )
        )

    group_members: dict[int, list[AddressBookGroupMember]] = {}
    for member in members:
        agent = agent_map.get(member.agent_id)
        instance = instance_map.get(member.instance_id)
        if not agent or not instance:
            continue
        group_members.setdefault(member.group_id, []).append(
            AddressBookGroupMember(
                id=member.id,
                instance_id=member.instance_id,
                agent_id=member.agent_id,
                display_name=agent.display_name,
                agent_key=agent.agent_key,
                instance_name=instance.name,
            )
        )

    return AddressBookResponse(
        instances=[
            AddressBookInstance(id=i.id, name=i.name, status=i.status, agents=grouped_agents.get(i.id, []))
            for i in instances
        ],
        groups=[
            AddressBookGroup(id=g.id, name=g.name, description=g.description, members=group_members.get(g.id, []))
            for g in groups
        ],
    )
