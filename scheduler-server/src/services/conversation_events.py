"""
这个文件负责会话级实时事件推送。

第一阶段只做最小能力：
1. 前端按 conversation_id 建立 WebSocket 连接。
2. 后端在消息发送、callback 更新后推一条 conversation.updated 事件。
3. 前端收到事件后继续复用现有 HTTP 接口做增量同步。

这样可以做到：
- WebSocket 负责“尽快通知”
- 现有轮询 / 增量查询继续负责“拿到正确数据”
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConversationEventHub:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, conversation_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[conversation_id].add(websocket)

    def disconnect(self, conversation_id: int, websocket: WebSocket) -> None:
        connections = self._connections.get(conversation_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(conversation_id, None)

    async def publish_update(self, conversation_id: int, payload: dict[str, Any] | None = None) -> None:
        connections = list(self._connections.get(conversation_id, set()))
        if not connections:
            return

        event = {
            "type": "conversation.updated",
            "conversationId": conversation_id,
            **(payload or {}),
        }

        stale: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(event)
            except Exception:
                stale.append(websocket)

        for websocket in stale:
            self.disconnect(conversation_id, websocket)


conversation_event_hub = ConversationEventHub()
