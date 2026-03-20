"""
这个文件负责第一阶段的会话与消息 API。

主要职责：
1. 创建单聊会话和群聊会话。
2. 查询某个会话下的消息与 dispatch 状态。
3. 接收用户发送的新消息，并把它分发到对应的 claw-team channel。

调用流程：
1. 前端先创建或获取一个 conversation。
2. 前端向 /api/conversations/{conversation_id}/messages 发送消息。
3. 这里先把用户消息落库，再按 direct / group 分支创建 dispatch。
4. 然后调用 channel 插件的 /claw-team/v1/inbound。
5. 后续 agent 回复会由 callbacks.py 接收并回写数据库。
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
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
    ConversationListItem,
    ConversationMessagesResponse,
    ConversationRead,
    DirectConversationCreate,
    DispatchRead,
    GroupConversationCreate,
    MessageCreate,
    MessageRead,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationListItem])
def list_conversations(db: Session = Depends(db_session)) -> list[ConversationListItem]:
    # 这个接口给前端左侧“最近会话列表”使用。
    # 第一阶段先用简单可读的方式拼装数据，优先保证前端可直接消费。
    conversations = list(db.scalars(select(Conversation).order_by(Conversation.updated_at.desc(), Conversation.id.desc())))

    items: list[ConversationListItem] = []
    for conversation in conversations:
        last_message = db.scalar(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc(), Message.id.desc())
        )
        group = db.get(ChatGroup, conversation.group_id) if conversation.group_id else None
        instance = db.get(OpenClawInstance, conversation.direct_instance_id) if conversation.direct_instance_id else None
        agent = db.get(AgentProfile, conversation.direct_agent_id) if conversation.direct_agent_id else None

        if conversation.type == "group":
            display_title = conversation.title or (group.name if group else f"群聊 {conversation.id}")
        else:
            if instance and agent:
                display_title = f"{instance.name} / {agent.display_name}"
            else:
                display_title = conversation.title or f"单聊 {conversation.id}"

        preview = None
        if last_message:
            # 侧栏只需要一个短摘要，避免把整条长文本直接塞进去。
            preview = last_message.content.strip().replace("\n", " ")
            if len(preview) > 80:
                preview = f"{preview[:80]}..."

        items.append(
            ConversationListItem(
                id=conversation.id,
                type=conversation.type,
                title=conversation.title,
                group_id=conversation.group_id,
                direct_instance_id=conversation.direct_instance_id,
                direct_agent_id=conversation.direct_agent_id,
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
                display_title=display_title,
                group_name=group.name if group else None,
                instance_name=instance.name if instance else None,
                agent_display_name=agent.display_name if agent else None,
                last_message_id=last_message.id if last_message else None,
                last_message_preview=preview,
                last_message_sender_type=last_message.sender_type if last_message else None,
                last_message_sender_label=last_message.sender_label if last_message else None,
                last_message_at=last_message.created_at.isoformat() if last_message else None,
                last_message_status=last_message.status if last_message else None,
            )
        )

    # 这里按最后一条消息时间优先排序；如果还没有消息，就回退到会话自身创建时间。
    items.sort(key=lambda item: item.last_message_at or item.created_at.isoformat(), reverse=True)
    return items


@router.post("/direct", response_model=ConversationRead)
def create_or_get_direct_conversation(payload: DirectConversationCreate, db: Session = Depends(db_session)) -> Conversation:
    # 单聊会话的唯一键是 instance_id + agent_id，所以这里是“查到就复用，查不到再创建”。
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
    # 群聊会话的唯一键是 group_id，一般一个群只维护一个会话视图。
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
def list_conversation_messages(
    conversation_id: int,
    message_after: str | None = Query(default=None, alias="messageAfter"),
    dispatch_after: str | None = Query(default=None, alias="dispatchAfter"),
    db: Session = Depends(db_session),
) -> ConversationMessagesResponse:
    # 第一阶段先提供“最小增量拉取”：
    # 1. 首次进入会话时不带 cursor，返回全部消息与 dispatch。
    # 2. 后续轮询时带上上次看到的最后一个 message / dispatch id，只拉新增部分。
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="conversation not found")

    message_query = select(Message).where(Message.conversation_id == conversation_id)
    dispatch_query = select(MessageDispatch).where(MessageDispatch.conversation_id == conversation_id)

    if message_after:
        cursor_message = db.get(Message, message_after)
        if cursor_message and cursor_message.conversation_id == conversation_id:
            message_query = message_query.where(
                (Message.created_at > cursor_message.created_at)
                | ((Message.created_at == cursor_message.created_at) & (Message.id > cursor_message.id))
            )
    if dispatch_after:
        cursor_dispatch = db.get(MessageDispatch, dispatch_after)
        if cursor_dispatch and cursor_dispatch.conversation_id == conversation_id:
            dispatch_query = dispatch_query.where(
                (MessageDispatch.created_at > cursor_dispatch.created_at)
                | ((MessageDispatch.created_at == cursor_dispatch.created_at) & (MessageDispatch.id > cursor_dispatch.id))
            )

    messages = list(db.scalars(message_query.order_by(Message.created_at, Message.id)))
    dispatches = list(db.scalars(dispatch_query.order_by(MessageDispatch.created_at, MessageDispatch.id)))
    return ConversationMessagesResponse(
        conversation=validate_orm(ConversationRead, conversation),
        messages=[validate_orm(MessageRead, item) for item in messages],
        dispatches=[validate_orm(DispatchRead, item) for item in dispatches],
        next_message_cursor=messages[-1].id if messages else message_after,
        next_dispatch_cursor=dispatches[-1].id if dispatches else dispatch_after,
    )


@router.post("/{conversation_id}/messages", response_model=MessageRead)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(db_session),
) -> Message:
    # 用户发消息时，先落一条“用户消息”，后续 dispatch 和 callback 都围绕这条 message.id 关联。
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

    # direct 只发给一个 agent；group 会先按 instance 分组，再分别调用对应 channel。
    if conversation.type == "direct":
        await _dispatch_direct(db=db, conversation=conversation, message=message)
    else:
        await _dispatch_group(db=db, conversation=conversation, message=message, mentions=payload.mentions)

    db.commit()
    db.refresh(message)
    return message


async def _dispatch_direct(*, db: Session, conversation: Conversation, message: Message) -> None:
    # 单聊场景下，conversation 上直接挂了目标 instance 和 agent。
    instance = db.get(OpenClawInstance, conversation.direct_instance_id)
    agent = db.get(AgentProfile, conversation.direct_agent_id)
    if not instance or not agent:
        raise HTTPException(status_code=400, detail="invalid direct conversation target")
    # dispatch 是“这条消息投递给某个 agent 的一次执行记录”，后续 callback 也靠它回填状态。
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
    # 这里组装的是发给 claw-team channel 的统一入站 payload，
    # 它的字段形状必须和 channel 插件侧 routes.py 约定保持一致。
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

    # 如果有 mentions，只保留被 @ 到的 agent；
    # 否则默认取当前群成员的全部 agent，形成广播。
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

    # 群成员可能分布在多个 OpenClaw 实例上，所以这里必须先按 instance 分组，
    # 然后分别调用各自实例上的 channel。
    for instance_id, instance_agents in by_instance.items():
        instance = db.get(OpenClawInstance, instance_id)
        if not instance:
            continue
        agent_keys = []
        for agent in instance_agents:
            # 同一条群消息会对应多条 dispatch，每个目标 agent 一条。
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

        # 一次 inbound 可能对应同一个 instance 下多个 agent。
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
