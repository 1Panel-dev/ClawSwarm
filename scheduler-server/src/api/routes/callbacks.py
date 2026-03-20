from __future__ import annotations

import json

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

router = APIRouter(prefix="/api/v1/claw-team", tags=["callbacks"])


@router.post("/events")
async def receive_callback(request: Request, db: Session = Depends(db_session)) -> dict[str, bool]:
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

    if timestamp and signature and not verify_callback_signature(token=token, timestamp=timestamp, body=body, signature=signature):
        raise HTTPException(status_code=401, detail="bad callback signature")

    event = json.loads(body.decode("utf-8"))
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

    db.add(
        MessageCallbackEvent(
            dispatch_id=dispatch.id,
            event_id=event.get("eventId", ""),
            event_type=event.get("eventType", ""),
            payload_json=event.get("payload", {}),
        )
    )

    dispatch.session_key = session_key or dispatch.session_key
    dispatch.status = _map_dispatch_status(event.get("eventType"))

    message = db.get(Message, message_id)
    if message:
        if event.get("eventType") == "reply.final":
            text = str(event.get("payload", {}).get("text", ""))
            agent_message = Message(
                id=f"msg_{event.get('eventId', dispatch.id)}",
                conversation_id=dispatch.conversation_id,
                sender_type="agent",
                sender_label=agent.display_name,
                content=text,
                status="completed",
            )
            db.add(agent_message)
            message.status = "completed"
        elif event.get("eventType") == "run.error":
            message.status = "failed"
        else:
            message.status = "streaming" if event.get("eventType") == "reply.chunk" else "accepted"

    db.commit()
    return {"ok": True}


def _map_dispatch_status(event_type: str | None) -> str:
    mapping = {
        "run.accepted": "accepted",
        "reply.chunk": "streaming",
        "reply.final": "completed",
        "run.error": "failed",
    }
    return mapping.get(event_type or "", "pending")
