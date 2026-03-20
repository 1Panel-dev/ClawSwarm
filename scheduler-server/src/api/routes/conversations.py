from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.integrations.channel_client import channel_client
from src.models.agent_profile import AgentProfile
from src.models.chat_group import ChatGroup
from src.models.chat_group_member import ChatGroupMember
from src.models.conversation import Conversation
from src.models.message import Message
from src.models.message_dispatch import MessageDispatch
from src.models.openclaw_instance import OpenClawInstance
from src.schemas.common import validate_orm
from src.schemas.conversation import (
    ConversationMessagesResponse,
    ConversationRead,
    DirectConversationCreate,
    DispatchRead,
    GroupConversationCreate,
    MessageCreate,
    MessageRead,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.post("/direct", response_model=ConversationRead)
def create_or_get_direct_conversation(payload: DirectConversationCreate, db: Session = Depends(db_session)) -> Conversation:
    instance = db.get(OpenClawInstance, payload.instance_id)
    agent = db.get(AgentProfile, payload.agent_id)
    if not instance or not agent:
        raise HTTPException(status_code=404, detail="instance or agent not found")
    existing = db.scalar(
        select(Conversation).where(
            Conversation.type == "direct",
            Conversation.direct_instance_id == payload.instance_id,
            Conversation.direct_agent_id == payload.agent_id,
        )
    )
    if existing:
        return existing
    item = Conversation(
        type="direct",
        title=f"{instance.name} / {agent.display_name}",
        direct_instance_id=payload.instance_id,
        direct_agent_id=payload.agent_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/group", response_model=ConversationRead)
def create_or_get_group_conversation(payload: GroupConversationCreate, db: Session = Depends(db_session)) -> Conversation:
    group = db.get(ChatGroup, payload.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    existing = db.scalar(
        select(Conversation).where(Conversation.type == "group", Conversation.group_id == payload.group_id)
    )
    if existing:
        return existing
    item = Conversation(type="group", title=group.name, group_id=payload.group_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{conversation_id}/messages", response_model=ConversationMessagesResponse)
def list_conversation_messages(conversation_id: int, db: Session = Depends(db_session)) -> ConversationMessagesResponse:
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="conversation not found")
    messages = list(db.scalars(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)))
    dispatches = list(
        db.scalars(select(MessageDispatch).where(MessageDispatch.conversation_id == conversation_id).order_by(MessageDispatch.created_at))
    )
    return ConversationMessagesResponse(
        conversation=validate_orm(ConversationRead, conversation),
        messages=[validate_orm(MessageRead, item) for item in messages],
        dispatches=[validate_orm(DispatchRead, item) for item in dispatches],
    )


@router.post("/{conversation_id}/messages", response_model=MessageRead)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(db_session),
) -> Message:
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="conversation not found")

    message = Message(
        id=f"msg_{uuid.uuid4().hex[:24]}",
        conversation_id=conversation_id,
        sender_type="user",
        sender_label="User",
        content=payload.content,
        status="pending",
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    if conversation.type == "direct":
        await _dispatch_direct(db=db, conversation=conversation, message=message)
    else:
        await _dispatch_group(db=db, conversation=conversation, message=message, mentions=payload.mentions)

    db.commit()
    db.refresh(message)
    return message


async def _dispatch_direct(*, db: Session, conversation: Conversation, message: Message) -> None:
    instance = db.get(OpenClawInstance, conversation.direct_instance_id)
    agent = db.get(AgentProfile, conversation.direct_agent_id)
    if not instance or not agent:
        raise HTTPException(status_code=400, detail="invalid direct conversation target")
    dispatch = MessageDispatch(
        id=f"dsp_{uuid.uuid4().hex[:24]}",
        message_id=message.id,
        conversation_id=conversation.id,
        instance_id=instance.id,
        agent_id=agent.id,
        dispatch_mode="direct",
        channel_message_id=message.id,
        status="pending",
    )
    db.add(dispatch)
    db.flush()
    response = await channel_client.send_inbound(
        instance=instance,
        payload={
            "messageId": message.id,
            "accountId": instance.channel_account_id,
            "chat": {"type": "direct", "chatId": str(conversation.id)},
            "from": {"userId": "user", "displayName": "User"},
            "text": message.content,
            "directAgentId": agent.agent_key,
        },
    )
    dispatch.status = "accepted"
    dispatch.channel_trace_id = response.get("traceId")
    message.status = "accepted"


async def _dispatch_group(*, db: Session, conversation: Conversation, message: Message, mentions: list[str]) -> None:
    if not conversation.group_id:
        raise HTTPException(status_code=400, detail="group conversation missing group id")
    group = db.get(ChatGroup, conversation.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="group not found")

    members = list(db.scalars(select(ChatGroupMember).where(ChatGroupMember.group_id == group.id)))
    agents = {agent.id: agent for agent in db.scalars(select(AgentProfile).where(AgentProfile.id.in_([m.agent_id for m in members])))}
    by_instance: dict[int, list[AgentProfile]] = {}

    if mentions:
        wanted = {token.strip().lower() for token in mentions if token.strip()}
        filtered = []
        for member in members:
            agent = agents.get(member.agent_id)
            if not agent:
                continue
            tokens = {agent.agent_key.lower(), agent.display_name.lower()}
            if tokens & wanted:
                filtered.append((member.instance_id, agent))
    else:
        filtered = [(member.instance_id, agents[member.agent_id]) for member in members if member.agent_id in agents]

    if not filtered:
        raise HTTPException(status_code=400, detail="no group members matched current message")

    for instance_id, agent in filtered:
        by_instance.setdefault(instance_id, []).append(agent)

    for instance_id, instance_agents in by_instance.items():
        instance = db.get(OpenClawInstance, instance_id)
        if not instance:
            continue
        agent_keys = []
        for agent in instance_agents:
            dispatch = MessageDispatch(
                id=f"dsp_{uuid.uuid4().hex[:24]}",
                message_id=message.id,
                conversation_id=conversation.id,
                instance_id=instance_id,
                agent_id=agent.id,
                dispatch_mode="group_mention" if mentions else "group_broadcast",
                channel_message_id=message.id,
                status="pending",
            )
            db.add(dispatch)
            agent_keys.append(agent.agent_key)
        db.flush()

        inbound_payload = {
            "messageId": message.id,
            "accountId": instance.channel_account_id,
            "chat": {"type": "group", "chatId": f"group-conv-{conversation.id}", "groupId": str(group.id)},
            "from": {"userId": "user", "displayName": "User"},
            "text": message.content,
        }
        if mentions:
            inbound_payload["mentions"] = agent_keys
        else:
            inbound_payload["targetAgentIds"] = agent_keys

        response = await channel_client.send_inbound(instance=instance, payload=inbound_payload)
        for agent in instance_agents:
            dispatch = db.scalar(
                select(MessageDispatch).where(
                    MessageDispatch.message_id == message.id,
                    MessageDispatch.instance_id == instance_id,
                    MessageDispatch.agent_id == agent.id,
                )
            )
            if dispatch:
                dispatch.status = "accepted"
                dispatch.channel_trace_id = response.get("traceId")
        message.status = "accepted"
