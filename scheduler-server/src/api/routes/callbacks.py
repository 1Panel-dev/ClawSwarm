"""
这个文件负责接收 claw-team channel 回调回来的执行事件。

主要职责：
1. 校验 callback token 和可选签名。
2. 根据 correlation 信息找到 dispatch 与原始用户消息。
3. 把 run.accepted / reply.chunk / reply.final / run.error 映射成数据库状态。
4. 在 reply.final 时额外落一条 agent 消息，供前端展示。

维护注意点：
1. callback 可能因为网络抖动、重试或超时而被重复投递。
2. 因此这里必须尽量做到幂等，避免重复落 agent 消息或把状态倒退回较早阶段。
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import db_session
from src.core.security import verify_callback_signature
from src.models.agent_profile import AgentProfile
from src.models.message import Message
from src.models.message_callback_event import MessageCallbackEvent
from src.models.message_dispatch import MessageDispatch
from src.models.openclaw_instance import OpenClawInstance
from src.services.conversation_events import conversation_event_hub

router = APIRouter(prefix="/api/v1/claw-team", tags=["callbacks"])


@router.post("/events")
async def receive_callback(request: Request, db: Session = Depends(db_session)) -> dict[str, bool]:
    # body 需要既参与签名校验，也要做 JSON 解析，所以这里先完整读出字节串。
    body = await request.body()
    auth_header = request.headers.get("authorization", "")
    timestamp = request.headers.get("x-claw-team-timestamp", "")
    signature = request.headers.get("x-claw-team-signature", "")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")

    token = auth_header.removeprefix("Bearer ").strip()
    instance = db.scalar(select(OpenClawInstance).where(OpenClawInstance.callback_token == token))
    if not instance:
        raise HTTPException(status_code=401, detail="unknown callback token")

    # channel 侧会附带可选签名；这里验证通过后，才能信任事件内容和来源。
    if timestamp and signature and not verify_callback_signature(token=token, timestamp=timestamp, body=body, signature=signature):
        raise HTTPException(status_code=401, detail="bad callback signature")

    event = json.loads(body.decode("utf-8"))
    event_id = str(event.get("eventId", "")).strip()
    event_type = str(event.get("eventType", "")).strip()
    correlation = event.get("correlation", {})
    message_id = correlation.get("messageId")
    session_key = correlation.get("sessionKey")
    agent_key = correlation.get("agentId")

    if not message_id or not agent_key:
        raise HTTPException(status_code=400, detail="invalid callback event")

    agent = db.scalar(select(AgentProfile).where(AgentProfile.instance_id == instance.id, AgentProfile.agent_key == agent_key))
    if not agent:
        raise HTTPException(status_code=404, detail="callback agent not found")

    dispatch = db.scalar(
        select(MessageDispatch).where(
            MessageDispatch.message_id == message_id,
            MessageDispatch.instance_id == instance.id,
            MessageDispatch.agent_id == agent.id,
        )
    )
    if not dispatch:
        raise HTTPException(status_code=404, detail="dispatch not found")

    existing_event = None
    if event_id:
        existing_event = db.scalar(
            select(MessageCallbackEvent).where(
                MessageCallbackEvent.dispatch_id == dispatch.id,
                MessageCallbackEvent.event_id == event_id,
            )
        )
    if existing_event:
        # 同一个 dispatch 下 eventId 已出现过时，直接视为成功处理，避免重复写消息或回退状态。
        return {"ok": True}

    # 无论事件类型是什么，都先把原始 callback 事件落库，方便后面排障和回放。
    db.add(
        MessageCallbackEvent(
            dispatch_id=dispatch.id,
            event_id=event_id,
            event_type=event_type,
            payload_json=event.get("payload", {}),
        )
    )

    dispatch.session_key = session_key or dispatch.session_key
    dispatch.status = _pick_higher_status(dispatch.status, _map_dispatch_status(event_type))

    message = db.get(Message, message_id)
    agent_message_id = f"msg_agent_{dispatch.id}"
    agent_message = db.get(Message, agent_message_id)
    if message:
        if event_type == "reply.final":
            # final 事件视为一次 agent 回复完成，因此生成一条 sender_type=agent 的消息。
            text = _build_message_content(event.get("payload", {}))
            if not agent_message:
                db.add(
                    Message(
                        id=agent_message_id,
                        conversation_id=dispatch.conversation_id,
                        sender_type="agent",
                        sender_label=agent.display_name,
                        content=text,
                        status="completed",
                    )
                )
            else:
                agent_message.content = text
                agent_message.status = "completed"
            message.status = "completed"
        elif event_type == "reply.chunk":
            chunk_text = str(event.get("payload", {}).get("text", ""))
            if chunk_text:
                if not agent_message:
                    db.add(
                        Message(
                            id=agent_message_id,
                            conversation_id=dispatch.conversation_id,
                            sender_type="agent",
                            sender_label=agent.display_name,
                            content=chunk_text,
                            status="streaming",
                        )
                    )
                else:
                    agent_message.content = f"{agent_message.content}{chunk_text}"
                    agent_message.status = "streaming"
            message.status = _pick_higher_status(message.status, "streaming")
        elif event_type == "run.error":
            if agent_message:
                agent_message.status = "failed"
            message.status = "failed"
        else:
            # accepted / chunk 都还没结束，只更新用户消息的过程态。
            next_message_status = "accepted"
            message.status = _pick_higher_status(message.status, next_message_status)

    db.commit()
    await conversation_event_hub.publish_update(
        dispatch.conversation_id,
        {
            "source": "callback",
            "eventType": event_type,
            "messageId": message_id,
        },
    )
    return {"ok": True}


def _map_dispatch_status(event_type: str | None) -> str:
    # 这里把 channel 事件类型收敛成 scheduler-server 自己更稳定的状态枚举。
    mapping = {
        "run.accepted": "accepted",
        "reply.chunk": "streaming",
        "reply.final": "completed",
        "run.error": "failed",
    }
    return mapping.get(event_type or "", "pending")


def _pick_higher_status(current_status: str | None, next_status: str | None) -> str:
    # 这里定义一个简单的状态优先级，避免较晚到达的旧事件把状态回退。
    order = {
        "pending": 0,
        "accepted": 1,
        "streaming": 2,
        "completed": 3,
        "failed": 3,
    }
    current = current_status or "pending"
    target = next_status or current
    return target if order.get(target, 0) >= order.get(current, 0) else current


def _build_message_content(payload: dict[str, Any]) -> str:
    """
    优先使用 callback 里已经结构化好的 parts。

    当前数据库还没升级成真正的 JSON parts 存储，
    所以这里先把 parts 回写成一段可逆 content：
    1. markdown 直接保留文本
    2. attachment / tool_card 用约定标记回写

    这样消息接口层依然能把它重新拆成 parts，
    前端也就能先看到真实 callback 产生的富内容。
    """
    raw_parts = payload.get("parts")
    if not isinstance(raw_parts, list) or not raw_parts:
        return str(payload.get("text", ""))

    chunks: list[str] = []
    for raw_part in raw_parts:
        if not isinstance(raw_part, dict):
            continue

        kind = str(raw_part.get("kind", "")).strip()
        if kind == "markdown":
            content = str(raw_part.get("content", "")).strip()
            if content:
                chunks.append(content)
            continue

        if kind == "attachment":
            name = str(raw_part.get("name", "")).strip()
            mime_type = str(raw_part.get("mimeType") or raw_part.get("mime_type") or "").strip()
            url = str(raw_part.get("url", "")).strip()
            if name and url:
                chunks.append(f"[[attachment:{name}|{mime_type}|{url}]]")
            continue

        if kind == "tool_card":
            title = str(raw_part.get("title", "")).strip()
            status = _normalize_tool_status(str(raw_part.get("status", "")).strip())
            summary = str(raw_part.get("summary", "")).strip()
            if title and summary:
                chunks.append(f"[[tool:{title}|{status}|{summary}]]")

    if chunks:
        return "\n\n".join(chunks)

    return str(payload.get("text", ""))


def _normalize_tool_status(value: str) -> str:
    if value in {"pending", "running", "completed", "failed"}:
        return value
    return "pending"
