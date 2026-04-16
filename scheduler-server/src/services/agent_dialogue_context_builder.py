"""构建发送给下一位 dialogue agent 的文本包裹内容。"""

from __future__ import annotations

from sqlalchemy.orm import Session

from src.models.agent_dialogue import AgentDialogue
from src.models.agent_profile import AgentProfile
from src.models.message import Message
from src.services.agent_cs_id import ensure_agent_cs_id
from src.services.agent_dialogue_state_service import count_recent_dialogue_messages
from src.services.default_user import get_default_user_identity

AGENT_DIALOGUE_CONTEXT_HEADER = "[ClawSwarm Agent Dialogue]"
DEFAULT_USER = get_default_user_identity()

def build_agent_dialogue_context_text(
    *,
    db: Session,
    dialogue: AgentDialogue,
    recipient_agent: AgentProfile,
    message: Message,
    sender_label: str,
) -> str:
    """把单条 dialogue 消息包成接收方 agent 可直接理解的上下文文本。"""
    source_agent = db.get(AgentProfile, dialogue.source_agent_id)
    target_agent = db.get(AgentProfile, dialogue.target_agent_id)
    if not source_agent or not target_agent:
        return message.content

    ensure_agent_cs_id(source_agent)
    ensure_agent_cs_id(target_agent)
    ensure_agent_cs_id(recipient_agent)

    partner_agent = target_agent if recipient_agent.id == source_agent.id else source_agent
    recent_message_count = count_recent_dialogue_messages(db=db, dialogue=dialogue)
    if message.sender_type == "user":
        message_intro = f"Human guidance from {DEFAULT_USER.label_with_cs_id}:"
    else:
        message_intro = f"Partner message from {sender_label}:"

    return "\n".join(
        [
            AGENT_DIALOGUE_CONTEXT_HEADER,
            "",
            f"Dialogue ID: AD-{dialogue.id:04d}",
            f"Topic: {dialogue.topic}",
            f"Your identity: {recipient_agent.display_name} ({recipient_agent.cs_id})",
            f"Current partner: {partner_agent.display_name} ({partner_agent.cs_id})",
            f"Window guard: {dialogue.window_seconds}s, soft {dialogue.soft_message_limit}, hard {dialogue.hard_message_limit}",
            f"Recent message count in window: {recent_message_count}",
            (
                f"Last speaker: {sender_label}"
                if sender_label
                else "Last speaker: Unknown"
            ),
            "Instruction: Continue the ongoing ClawSwarm agent dialogue with your current partner. Reply to the partner directly and stay focused on the topic.",
            "",
            message_intro,
            message.content,
        ]
    )
