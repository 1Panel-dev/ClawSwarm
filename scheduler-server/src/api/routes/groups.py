from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.models.agent_profile import AgentProfile
from src.models.chat_group import ChatGroup
from src.models.chat_group_member import ChatGroupMember
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.common import dump_model
from src.schemas.group import GroupCreate, GroupDetail, GroupMemberAddRequest, GroupMemberRead, GroupRead

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=list[GroupRead])
def list_groups(db: Session = Depends(db_session)) -> list[ChatGroup]:
    return list(db.scalars(select(ChatGroup).order_by(ChatGroup.id)))


@router.post("", response_model=GroupRead)
def create_group(payload: GroupCreate, db: Session = Depends(db_session)) -> ChatGroup:
    item = ChatGroup(**dump_model(payload))
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{group_id}", response_model=GroupDetail)
def get_group(group_id: int, db: Session = Depends(db_session)) -> GroupDetail:
    group = db.get(ChatGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    members = _load_group_members(db, group_id)
    return GroupDetail(id=group.id, name=group.name, description=group.description, members=members)


@router.post("/{group_id}/members", response_model=list[GroupMemberRead])
def add_group_members(group_id: int, payload: GroupMemberAddRequest, db: Session = Depends(db_session)) -> list[GroupMemberRead]:
    group = db.get(ChatGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="group not found")

    for item in payload.members:
        instance = db.get(OpenClawInstance, item.instance_id)
        agent = db.get(AgentProfile, item.agent_id)
        if not instance:
            raise HTTPException(status_code=404, detail=f"instance not found: {item.instance_id}")
        if not agent:
            raise HTTPException(status_code=404, detail=f"agent not found: {item.agent_id}")
        exists = db.scalar(
            select(ChatGroupMember).where(
                ChatGroupMember.group_id == group_id,
                ChatGroupMember.agent_id == item.agent_id,
            )
        )
        if not exists:
            db.add(ChatGroupMember(group_id=group_id, instance_id=item.instance_id, agent_id=item.agent_id))

    db.commit()
    return _load_group_members(db, group_id)


@router.delete("/{group_id}/members/{member_id}", response_model=GroupDetail)
def delete_group_member(group_id: int, member_id: int, db: Session = Depends(db_session)) -> GroupDetail:
    group = db.get(ChatGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    member = db.get(ChatGroupMember, member_id)
    if not member or member.group_id != group_id:
        raise HTTPException(status_code=404, detail="group member not found")
    db.delete(member)
    db.commit()
    return GroupDetail(id=group.id, name=group.name, description=group.description, members=_load_group_members(db, group_id))


def _load_group_members(db: Session, group_id: int) -> list[GroupMemberRead]:
    members = list(db.scalars(select(ChatGroupMember).where(ChatGroupMember.group_id == group_id).order_by(ChatGroupMember.id)))
    out: list[GroupMemberRead] = []
    for member in members:
        agent = db.get(AgentProfile, member.agent_id)
        instance = db.get(OpenClawInstance, member.instance_id)
        if not agent or not instance:
            continue
        out.append(
            GroupMemberRead(
                id=member.id,
                group_id=member.group_id,
                instance_id=member.instance_id,
                agent_id=member.agent_id,
                joined_at=member.joined_at.astimezone(timezone.utc).isoformat(),
                agent_key=agent.agent_key,
                display_name=agent.display_name,
                role_name=agent.role_name,
                instance_name=instance.name,
            )
        )
    return out
