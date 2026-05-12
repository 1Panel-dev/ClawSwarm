"""Hermes API Server 客户端。"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import httpx

from src.models.hermes_instance import HermesInstance


class HermesClient:
    async def fetch_capabilities(self, *, instance: HermesInstance) -> dict[str, Any]:
        """读取 Hermes 能力信息。"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                instance.api_base_url.rstrip("/") + "/v1/capabilities",
                headers=self._headers(instance),
            )
        response.raise_for_status()
        return response.json()

    async def stream_response(self, *, instance: HermesInstance, payload: dict[str, Any]) -> AsyncIterator[dict[str, Any]]:
        """以 SSE 流式调用 Hermes Responses API。"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                instance.api_base_url.rstrip("/") + "/v1/responses",
                headers=self._headers(instance),
                json={**payload, "stream": True},
            ) as response:
                response.raise_for_status()
                async for event in self._iter_sse_events(response):
                    yield event

    async def _iter_sse_events(self, response: httpx.Response) -> AsyncIterator[dict[str, Any]]:
        event_type: str | None = None
        data_lines: list[str] = []
        async for line in response.aiter_lines():
            if line == "":
                event = self._decode_sse_event(event_type=event_type, data_lines=data_lines)
                event_type = None
                data_lines = []
                if event is not None:
                    yield event
                continue
            if line.startswith("event:"):
                event_type = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                data_lines.append(line.removeprefix("data:").strip())

        event = self._decode_sse_event(event_type=event_type, data_lines=data_lines)
        if event is not None:
            yield event

    def _decode_sse_event(self, *, event_type: str | None, data_lines: list[str]) -> dict[str, Any] | None:
        if not data_lines:
            return None
        data = "\n".join(data_lines).strip()
        if not data or data == "[DONE]":
            return None
        payload = json.loads(data)
        if isinstance(payload, dict) and event_type and "type" not in payload:
            payload["type"] = event_type
        return payload

    def _headers(self, instance: HermesInstance) -> dict[str, str]:
        headers = {"content-type": "application/json; charset=utf-8"}
        api_key = (instance.api_key or "").strip()
        if api_key:
            headers["authorization"] = f"Bearer {api_key}"
        return headers


hermes_client = HermesClient()
