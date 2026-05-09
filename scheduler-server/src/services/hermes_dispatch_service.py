"""Hermes Profile 消息分发服务。"""

from __future__ import annotations

import time
import uuid
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.integrations.hermes_client import hermes_client
from src.models.conversation import Conversation
from src.models.hermes_conversation_state import HermesConversationState
from src.models.hermes_instance import HermesInstance
from src.models.hermes_profile import HermesProfile
from src.models.message import Message
from src.models.message_dispatch import MessageDispatch
from src.models.runtime_target import RuntimeTarget
from src.services.conversation_events import conversation_event_hub

STREAM_UPDATE_INTERVAL_SECONDS = 0.3


async def dispatch_hermes_direct_message(
    *,
    db: Session,
    conversation: Conversation,
    message: Message,
) -> list[str]:
    """把用户消息发送给 Hermes Profile，并同步写入回复。"""
    target = db.get(RuntimeTarget, conversation.direct_runtime_target_id)
    if not target or target.runtime_type != "hermes":
        raise HTTPException(status_code=400, detail="invalid Hermes conversation target")
    profile = db.get(HermesProfile, target.runtime_profile_id)
    instance = db.get(HermesInstance, target.runtime_instance_id)
    if not profile or profile.removed or not instance:
        raise HTTPException(status_code=404, detail="Hermes profile not found")
    if instance.status == "disabled" or not profile.enabled or not target.enabled:
        raise HTTPException(status_code=400, detail="Hermes profile is disabled")

    dispatch = MessageDispatch(
        id=f"dsp_{uuid.uuid4().hex[:24]}",
        message_id=message.id,
        conversation_id=conversation.id,
        runtime_target_id=target.id,
        dispatch_mode="hermes_direct",
        channel_message_id=message.id,
        status="pending",
    )
    db.add(dispatch)
    db.flush()

    state = db.scalar(
        select(HermesConversationState).where(
            HermesConversationState.conversation_id == conversation.id,
            HermesConversationState.hermes_profile_id == profile.id,
        )
    )
    if state is None:
        state = HermesConversationState(
            conversation_id=conversation.id,
            hermes_instance_id=instance.id,
            hermes_profile_id=profile.id,
            hermes_conversation_key=f"clawswarm-conversation-{conversation.id}",
        )
        db.add(state)
        db.flush()

    payload = build_hermes_response_payload(instance=instance, profile=profile, state=state, message=message)
    reply_message = Message(
        id=f"msg_hermes_{dispatch.id}",
        conversation_id=conversation.id,
        sender_type="agent",
        sender_label=profile.display_name,
        sender_cs_id=target.cs_id,
        content="",
        status="pending",
    )
    db.add(reply_message)

    # 先提交本地消息、dispatch 和 Hermes 会话状态，避免持有 SQLite 写锁等待外部 Hermes 调用。
    db.commit()
    await publish_hermes_update(conversation.id, reply_message.id)

    try:
        reply_text, response_id, conversation_key = await stream_hermes_response_to_message(
            db=db,
            instance=instance,
            payload=payload,
            conversation_id=conversation.id,
            reply_message=reply_message,
        )
    except httpx.TimeoutException as exc:
        mark_hermes_dispatch_failed(db=db, dispatch=dispatch, message=message, reply_message=reply_message, error_message="Hermes timed out")
        raise HTTPException(status_code=504, detail="Hermes timed out") from exc
    except (httpx.ConnectError, httpx.NetworkError, httpx.ProxyError) as exc:
        mark_hermes_dispatch_failed(
            db=db,
            dispatch=dispatch,
            message=message,
            reply_message=reply_message,
            error_message="Hermes instance is unreachable",
        )
        raise HTTPException(status_code=503, detail="Hermes instance is unreachable") from exc
    except httpx.HTTPStatusError as exc:
        error_message = f"Hermes request failed with HTTP {exc.response.status_code}"
        mark_hermes_dispatch_failed(db=db, dispatch=dispatch, message=message, reply_message=reply_message, error_message=error_message)
        if exc.response.status_code in {401, 403}:
            raise HTTPException(status_code=400, detail="Hermes authentication failed") from exc
        raise HTTPException(status_code=502, detail="Hermes request failed") from exc
    except ValueError as exc:
        mark_hermes_dispatch_failed(
            db=db,
            dispatch=dispatch,
            message=message,
            reply_message=reply_message,
            error_message="Hermes returned an invalid response",
        )
        raise HTTPException(status_code=502, detail="Hermes returned an invalid response") from exc

    reply_message.content = reply_text
    reply_message.status = "completed"
    dispatch.status = "completed"
    dispatch.channel_trace_id = response_id
    message.status = "completed"
    state.last_response_id = response_id or state.last_response_id
    state.hermes_conversation_key = conversation_key or state.hermes_conversation_key
    db.commit()
    return [dispatch.id]


async def stream_hermes_response_to_message(
    *,
    db: Session,
    instance: HermesInstance,
    payload: dict[str, Any],
    conversation_id: int,
    reply_message: Message,
) -> tuple[str, str | None, str | None]:
    """读取 Hermes SSE 事件，节流写入回复消息内容。"""
    chunks: list[str] = []
    response_id: str | None = None
    conversation_key: str | None = None
    last_flush_at = 0.0

    async for event in hermes_client.stream_response(instance=instance, payload=payload):
        event_type = str(event.get("type") or event.get("event") or "").strip()
        if event_type in {"response.created", "response.completed"}:
            response_payload = event.get("response") if isinstance(event.get("response"), dict) else event
            if isinstance(response_payload, dict):
                response_id = str(response_payload.get("id") or response_id or "").strip() or response_id
                conversation_key = _extract_conversation_key(response_payload) or conversation_key

        delta = extract_stream_text_delta(event)
        if delta:
            chunks.append(delta)
            now = time.monotonic()
            if now - last_flush_at >= STREAM_UPDATE_INTERVAL_SECONDS:
                reply_message.content = "".join(chunks)
                reply_message.status = "pending"
                db.commit()
                await publish_hermes_update(conversation_id, reply_message.id)
                last_flush_at = now

    reply_text = "".join(chunks).strip()
    if not reply_text:
        raise ValueError("Hermes response does not contain text")
    reply_message.content = reply_text
    db.commit()
    await publish_hermes_update(conversation_id, reply_message.id)
    return reply_text, response_id, conversation_key


async def publish_hermes_update(conversation_id: int, message_id: str) -> None:
    await conversation_event_hub.publish_update(
        conversation_id,
        {
            "source": "hermes_stream",
            "messageId": message_id,
        },
    )


def extract_stream_text_delta(event: dict[str, Any]) -> str:
    """从 Responses API SSE 事件中提取文本增量。"""
    delta = event.get("delta")
    if isinstance(delta, str):
        return delta
    if isinstance(delta, dict):
        text = delta.get("text") or delta.get("content")
        if isinstance(text, str):
            return text
    text = event.get("text")
    if isinstance(text, str):
        return text
    return ""


async def run_hermes_direct_dispatch(
    *,
    session_local,
    conversation_id: int,
    message_id: str,
) -> None:
    """在独立 Session 中执行 Hermes 分发，避免阻塞发送消息接口。"""
    with session_local() as db:
        conversation = db.get(Conversation, conversation_id)
        message = db.get(Message, message_id)
        if not conversation or not message:
            return
        try:
            await dispatch_hermes_direct_message(db=db, conversation=conversation, message=message)
        except HTTPException:
            # dispatch_hermes_direct_message 已经负责把可预期错误写回 message / dispatch。
            # 后台任务不能继续抛出异常，否则事件循环会输出未回收任务异常。
            pass
        finally:
            await conversation_event_hub.publish_update(
                conversation_id,
                {
                    "source": "hermes_dispatch",
                    "messageId": message_id,
                },
            )


def build_hermes_response_payload(
    *,
    instance: HermesInstance,
    profile: HermesProfile,
    state: HermesConversationState,
    message: Message,
) -> dict[str, Any]:
    """构造 Hermes Responses API 请求。"""
    model = (profile.model or instance.default_model or profile.profile_key).strip()
    payload: dict[str, Any] = {
        "model": model,
        "input": message.content,
    }
    if state.last_response_id:
        payload["previous_response_id"] = state.last_response_id
    elif state.hermes_conversation_key:
        payload["conversation"] = state.hermes_conversation_key
    return payload


def _extract_conversation_key(response: dict[str, Any]) -> str | None:
    raw = response.get("conversation")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    if isinstance(raw, dict):
        value = raw.get("id") or raw.get("key")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def mark_hermes_dispatch_failed(
    *,
    db: Session,
    dispatch: MessageDispatch,
    message: Message,
    reply_message: Message | None = None,
    error_message: str,
) -> None:
    dispatch.status = "failed"
    dispatch.error_message = error_message
    message.status = "failed"
    if reply_message is not None:
        reply_message.status = "failed"
    db.commit()
