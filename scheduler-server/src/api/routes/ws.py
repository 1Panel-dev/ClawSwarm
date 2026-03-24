"""
这个文件提供第一阶段消息实时通知的 WebSocket 入口。

设计原则：
1. 连接只负责“通知有更新”，不直接推全量消息。
2. 前端收到事件后，继续调用现有消息接口做增量拉取。
3. 这样能保留当前 HTTP 轮询链路，同时把实时性提升起来。
"""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.services.conversation_events import conversation_event_hub

router = APIRouter(tags=["ws"])


@router.websocket("/ws/conversations/{conversation_id}")
async def conversation_updates(websocket: WebSocket, conversation_id: int) -> None:
    await conversation_event_hub.connect(conversation_id, websocket)
    try:
        while True:
            # 目前只需要保持连接存活，不要求客户端发命令。
            await websocket.receive_text()
    except WebSocketDisconnect:
        conversation_event_hub.disconnect(conversation_id, websocket)
    except Exception:
        conversation_event_hub.disconnect(conversation_id, websocket)
