"""Agent dialogue 工作流的编排辅助函数。"""
from __future__ import annotations

import asyncio
import uuid

from fastapi import HTTPException
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.integrations.channel_client import channel_client
from src.models.agent_dialogue import AgentDialogue
from src.models.agent_profile import AgentProfile
from src.models.conversation import Conversation
from src.models.hermes_conversation_state import HermesConversationState
from src.models.hermes_instance import HermesInstance
from src.models.message import Message
from src.models.message_dispatch import MessageDispatch
from src.models.openclaw_instance import OpenClawInstance
from src.models.runtime_target import RuntimeTarget
from src.services.agent_dialogue_context_builder import build_runtime_dialogue_context_text
from src.services.agent_dialogue_state_service import (
    apply_dialogue_window_guards,
    find_latest_undispatched_message,
    has_in_flight_dispatch,
    next_runtime_target_id_for_dialogue,
    pick_next_runtime_target_id,
)
from src.services.default_user import get_default_user_identity
from src.services.hermes_dispatch_service import (
    build_hermes_response_payload,
    mark_hermes_dispatch_failed,
    publish_hermes_update,
    stream_hermes_response_to_message,
)
from src.services.runtime_target_service import sync_openclaw_runtime_target

AGENT_DIALOGUE_CHANNEL_PREFIX = "agent-dialogue"
DEFAULT_USER = get_default_user_identity()


async def dispatch_agent_dialogue_opening_turn(
    *,
    db: Session,
    dialogue: AgentDialogue,
    opening_message: Message,
    session_local=None,
) -> str | None:
    """Send the first turn of a dialogue to its source agent."""
    ensure_dialogue_runtime_targets(db=db, dialogue=dialogue)
    source_target = get_dialogue_runtime_target(db=db, dialogue=dialogue, target_id=dialogue.source_runtime_target_id)
    conversation = db.get(Conversation, dialogue.conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="conversation not found")

    return await dispatch_agent_dialogue_turn(
        db=db,
        dialogue=dialogue,
        conversation=conversation,
        message=opening_message,
        recipient_target=source_target,
        sender_label=DEFAULT_USER.label_with_cs_id,
        sender_user_id=DEFAULT_USER.internal_id,
        dispatch_mode="agent_dialogue_opening",
        session_local=session_local,
    )


async def continue_agent_dialogue_after_reply(
    *,
    db: Session,
    dialogue: AgentDialogue,
    dispatch: MessageDispatch,
    reply_message: Message,
    session_local=None,
) -> str | None:
    """Relay a completed reply to the next participant when the dialogue stays active."""
    if dialogue.status == "stopped":
        return None

    ensure_dialogue_runtime_targets(db=db, dialogue=dialogue)
    if dispatch.runtime_target_id is None and dispatch.agent_id is not None:
        agent = db.get(AgentProfile, dispatch.agent_id)
        if agent:
            dispatch.runtime_target_id = sync_openclaw_runtime_target(db=db, agent=agent).id
            db.flush()
    current_speaker = db.get(RuntimeTarget, dispatch.runtime_target_id) if dispatch.runtime_target_id else None
    if not current_speaker:
        dialogue.status = "stopped"
        db.commit()
        return None

    dialogue.last_speaker_runtime_target_id = current_speaker.id
    if current_speaker.runtime_type == "openclaw":
        dialogue.last_speaker_agent_id = current_speaker.runtime_profile_id

    # Keep the latest speaker even while paused so a later resume can continue
    # from the correct side.
    if dialogue.status != "active":
        db.commit()
        return None

    # Human interventions take priority over continuing the normal relay once
    # the current turn finishes.
    pending_user_message = find_latest_undispatched_message(db=db, dialogue=dialogue, sender_type="user")
    if pending_user_message:
        conversation = db.get(Conversation, dialogue.conversation_id)
        next_target_id = pick_next_runtime_target_id(dialogue, current_speaker.id)
        next_target = db.get(RuntimeTarget, next_target_id) if next_target_id else None
        if next_target and conversation:
            return await dispatch_agent_dialogue_turn(
                db=db,
                dialogue=dialogue,
                conversation=conversation,
                message=pending_user_message,
                recipient_target=next_target,
                sender_label=DEFAULT_USER.label_with_cs_id,
                sender_user_id=DEFAULT_USER.internal_id,
                dispatch_mode="agent_dialogue_intervention",
                session_local=session_local,
            )

    next_target_id = pick_next_runtime_target_id(dialogue, current_speaker.id)
    if next_target_id is None:
        dialogue.status = "stopped"
        db.commit()
        return None

    next_target = db.get(RuntimeTarget, next_target_id)
    conversation = db.get(Conversation, dialogue.conversation_id)
    if not next_target or not conversation:
        dialogue.status = "stopped"
        db.commit()
        return None

    return await dispatch_agent_dialogue_turn(
        db=db,
        dialogue=dialogue,
        conversation=conversation,
        message=reply_message,
        recipient_target=next_target,
        sender_label=current_speaker.display_name,
        sender_user_id=f"runtime:{current_speaker.runtime_type}:{current_speaker.target_key}",
        dispatch_mode="agent_dialogue_relay",
        session_local=session_local,
    )


async def dispatch_agent_dialogue_turn(
    *,
    db: Session,
    dialogue: AgentDialogue,
    conversation: Conversation,
    message: Message,
    recipient_target: RuntimeTarget,
    sender_label: str,
    sender_user_id: str,
    dispatch_mode: str,
    session_local=None,
) -> str | None:
    """Dispatch an existing dialogue message to one Runtime Target."""
    guard_result = apply_dialogue_window_guards(db=db, dialogue=dialogue, conversation=conversation)
    if guard_result == "stopped":
        db.commit()
        return None

    if recipient_target.runtime_type == "hermes":
        return await dispatch_agent_dialogue_hermes_turn(
            db=db,
            dialogue=dialogue,
            conversation=conversation,
            message=message,
            recipient_target=recipient_target,
            sender_label=sender_label,
            dispatch_mode=dispatch_mode,
            session_local=session_local,
        )

    recipient_agent = db.get(AgentProfile, recipient_target.runtime_profile_id)
    if not recipient_agent:
        dialogue.status = "stopped"
        db.commit()
        return None

    instance = db.get(OpenClawInstance, recipient_agent.instance_id)
    if not instance:
        dialogue.status = "stopped"
        db.commit()
        return None

    dispatch = MessageDispatch(
        id=f"dsp_{uuid.uuid4().hex[:24]}",
        message_id=message.id,
        conversation_id=conversation.id,
        instance_id=instance.id,
        agent_id=recipient_agent.id,
        runtime_target_id=sync_openclaw_runtime_target(db=db, agent=recipient_agent).id,
        dispatch_mode=dispatch_mode,
        channel_message_id=message.id,
        status="pending",
    )
    db.add(dispatch)
    db.flush()

    packaged_text = build_runtime_dialogue_context_text(
        db=db,
        dialogue=dialogue,
        recipient_target=recipient_target,
        message=message,
        sender_label=sender_label,
    )

    # 先提交本地消息和 dispatch，避免持有 SQLite 写锁等待外部 OpenClaw 调用。
    db.commit()

    try:
        response = await channel_client.send_inbound(
            instance=instance,
            payload={
                "messageId": message.id,
                "accountId": instance.channel_account_id,
                "chat": {"type": "direct", "chatId": f"{AGENT_DIALOGUE_CHANNEL_PREFIX}-{conversation.id}"},
                "from": {"userId": sender_user_id, "displayName": sender_label},
                "text": packaged_text,
                "directAgentId": recipient_agent.agent_key,
            },
        )
    except Exception:
        dispatch.status = "failed"
        dispatch.error_message = "OpenClaw request failed"
        db.commit()
        raise

    dispatch.status = "accepted"
    dispatch.channel_trace_id = response.get("traceId")
    db.commit()
    return dispatch.id


async def dispatch_agent_dialogue_hermes_turn(
    *,
    db: Session,
    dialogue: AgentDialogue,
    conversation: Conversation,
    message: Message,
    recipient_target: RuntimeTarget,
    sender_label: str,
    dispatch_mode: str,
    session_local=None,
) -> str | None:
    """Create a Hermes dialogue dispatch and run it in the background."""
    instance = db.get(HermesInstance, recipient_target.runtime_instance_id)
    if not instance or instance.status == "disabled" or not recipient_target.enabled:
        dialogue.status = "stopped"
        db.commit()
        return None

    dispatch = MessageDispatch(
        id=f"dsp_{uuid.uuid4().hex[:24]}",
        message_id=message.id,
        conversation_id=conversation.id,
        runtime_target_id=recipient_target.id,
        dispatch_mode=dispatch_mode,
        channel_message_id=message.id,
        status="pending",
    )
    reply_message = Message(
        id=f"msg_hermes_{dispatch.id}",
        conversation_id=conversation.id,
        sender_type="agent",
        sender_label=recipient_target.display_name,
        sender_cs_id=recipient_target.cs_id,
        content="",
        status="pending",
    )
    db.add(dispatch)
    db.add(reply_message)
    db.flush()
    db.commit()
    await publish_hermes_update(conversation.id, reply_message.id)

    if session_local is not None:
        schedule_agent_dialogue_hermes_dispatch(session_local=session_local, dispatch_id=dispatch.id)
    return dispatch.id


def schedule_agent_dialogue_hermes_dispatch(*, session_local, dispatch_id: str) -> None:
    """Schedule one Hermes Agent Dialogue dispatch on the current event loop."""
    asyncio.create_task(run_agent_dialogue_hermes_dispatch(session_local=session_local, dispatch_id=dispatch_id))


async def run_agent_dialogue_hermes_dispatch(*, session_local, dispatch_id: str) -> None:
    """Run a pending Hermes Agent Dialogue dispatch in a fresh Session."""
    with session_local() as db:
        dispatch = db.get(MessageDispatch, dispatch_id)
        if not dispatch:
            return
        dialogue = db.scalar(select(AgentDialogue).where(AgentDialogue.conversation_id == dispatch.conversation_id))
        message = db.get(Message, dispatch.message_id)
        recipient_target = db.get(RuntimeTarget, dispatch.runtime_target_id) if dispatch.runtime_target_id else None
        if not dialogue or not message or not recipient_target:
            return
        reply_message = db.get(Message, f"msg_hermes_{dispatch.id}")
        if not reply_message:
            return

        instance = db.get(HermesInstance, recipient_target.runtime_instance_id)
        if not instance:
            mark_hermes_dispatch_failed(
                db=db,
                dispatch=dispatch,
                message=message,
                reply_message=reply_message,
                error_message="Hermes endpoint not found",
            )
            return

        state = db.scalar(
            select(HermesConversationState).where(
                HermesConversationState.conversation_id == dispatch.conversation_id,
                HermesConversationState.hermes_instance_id == instance.id,
            )
        )
        if state is None:
            state = HermesConversationState(
                conversation_id=dispatch.conversation_id,
                hermes_instance_id=instance.id,
                hermes_conversation_key=f"clawswarm-agent-dialogue-{dialogue.id}-{instance.id}",
            )
            db.add(state)
            db.flush()

        input_text = build_runtime_dialogue_context_text(
            db=db,
            dialogue=dialogue,
            recipient_target=recipient_target,
            message=message,
            sender_label=message.sender_label,
        )
        payload = build_hermes_response_payload(
            instance=instance,
            state=state,
            message=message,
            input_text=input_text,
        )
        dispatch.status = "streaming"
        db.commit()

        try:
            reply_text, response_id, conversation_key = await stream_hermes_response_to_message(
                db=db,
                instance=instance,
                payload=payload,
                conversation_id=dispatch.conversation_id,
                reply_message=reply_message,
            )
        except httpx.TimeoutException:
            mark_hermes_dispatch_failed(db=db, dispatch=dispatch, message=message, reply_message=reply_message, error_message="Hermes timed out")
            return
        except (httpx.ConnectError, httpx.NetworkError, httpx.ProxyError):
            mark_hermes_dispatch_failed(
                db=db,
                dispatch=dispatch,
                message=message,
                reply_message=reply_message,
                error_message="Hermes instance is unreachable",
            )
            return
        except httpx.HTTPStatusError as exc:
            mark_hermes_dispatch_failed(
                db=db,
                dispatch=dispatch,
                message=message,
                reply_message=reply_message,
                error_message=f"Hermes request failed with HTTP {exc.response.status_code}",
            )
            return
        except ValueError:
            mark_hermes_dispatch_failed(
                db=db,
                dispatch=dispatch,
                message=message,
                reply_message=reply_message,
                error_message="Hermes returned an invalid response",
            )
            return

        reply_message.content = reply_text
        reply_message.status = "completed"
        dispatch.status = "completed"
        dispatch.channel_trace_id = response_id
        message.status = "completed"
        state.last_response_id = response_id or state.last_response_id
        state.hermes_conversation_key = conversation_key or state.hermes_conversation_key
        db.commit()
        await continue_agent_dialogue_after_reply(
            db=db,
            dialogue=dialogue,
            dispatch=dispatch,
            reply_message=reply_message,
            session_local=session_local,
        )


async def dispatch_agent_dialogue_intervention(
    *,
    db: Session,
    dialogue: AgentDialogue,
    message: Message,
    session_local=None,
) -> str | None:
    """Forward one human intervention message if the dialogue is ready."""
    ensure_dialogue_runtime_targets(db=db, dialogue=dialogue)
    if dialogue.status != "active" or has_in_flight_dispatch(db, dialogue):
        return None

    next_target_id = next_runtime_target_id_for_dialogue(dialogue)
    if next_target_id is None:
        return None

    recipient_target = db.get(RuntimeTarget, next_target_id)
    conversation = db.get(Conversation, dialogue.conversation_id)
    if not recipient_target or not conversation:
        return None

    return await dispatch_agent_dialogue_turn(
        db=db,
        dialogue=dialogue,
        conversation=conversation,
        message=message,
        recipient_target=recipient_target,
        sender_label=DEFAULT_USER.label_with_cs_id,
        sender_user_id=DEFAULT_USER.internal_id,
        dispatch_mode="agent_dialogue_intervention",
        session_local=session_local,
    )


async def resume_agent_dialogue_if_possible(*, db: Session, dialogue: AgentDialogue, session_local=None) -> str | None:
    """Resume a paused dialogue by dispatching the newest pending message."""
    ensure_dialogue_runtime_targets(db=db, dialogue=dialogue)
    if dialogue.status != "active" or has_in_flight_dispatch(db, dialogue):
        return None

    pending_user_message = find_latest_undispatched_message(db=db, dialogue=dialogue, sender_type="user")
    if pending_user_message:
        return await dispatch_agent_dialogue_intervention(
            db=db,
            dialogue=dialogue,
            message=pending_user_message,
            session_local=session_local,
        )

    pending_agent_message = find_latest_undispatched_message(db=db, dialogue=dialogue, sender_type="agent")
    if not pending_agent_message:
        return None

    next_target_id = next_runtime_target_id_for_dialogue(dialogue)
    sender_target = db.get(RuntimeTarget, dialogue.last_speaker_runtime_target_id) if dialogue.last_speaker_runtime_target_id else None
    recipient_target = db.get(RuntimeTarget, next_target_id) if next_target_id else None
    conversation = db.get(Conversation, dialogue.conversation_id)
    if not recipient_target or not conversation or not sender_target:
        return None

    return await dispatch_agent_dialogue_turn(
        db=db,
        dialogue=dialogue,
        conversation=conversation,
        message=pending_agent_message,
        recipient_target=recipient_target,
        sender_label=pending_agent_message.sender_label,
        sender_user_id=f"runtime:{sender_target.runtime_type}:{sender_target.target_key}",
        dispatch_mode="agent_dialogue_relay",
        session_local=session_local,
    )


def get_dialogue_runtime_target(*, db: Session, dialogue: AgentDialogue, target_id: int | None) -> RuntimeTarget:
    """Load one dialogue Runtime Target or fall back to legacy OpenClaw agent fields."""
    if target_id is not None:
        target = db.get(RuntimeTarget, target_id)
        if target:
            return target
    if dialogue.source_agent_id:
        agent = db.get(AgentProfile, dialogue.source_agent_id)
        if agent:
            return sync_openclaw_runtime_target(db=db, agent=agent)
    raise HTTPException(status_code=404, detail="runtime target not found")


def ensure_dialogue_runtime_targets(*, db: Session, dialogue: AgentDialogue) -> None:
    """为旧的 OpenClaw-only Agent Dialogue 补齐 Runtime Target 字段。"""
    if dialogue.source_runtime_target_id is None and dialogue.source_agent_id is not None:
        source_agent = db.get(AgentProfile, dialogue.source_agent_id)
        if source_agent:
            dialogue.source_runtime_target_id = sync_openclaw_runtime_target(db=db, agent=source_agent).id
    if dialogue.target_runtime_target_id is None and dialogue.target_agent_id is not None:
        target_agent = db.get(AgentProfile, dialogue.target_agent_id)
        if target_agent:
            dialogue.target_runtime_target_id = sync_openclaw_runtime_target(db=db, agent=target_agent).id
    if dialogue.last_speaker_runtime_target_id is None and dialogue.last_speaker_agent_id is not None:
        last_speaker = db.get(AgentProfile, dialogue.last_speaker_agent_id)
        if last_speaker:
            dialogue.last_speaker_runtime_target_id = sync_openclaw_runtime_target(db=db, agent=last_speaker).id
    db.flush()
