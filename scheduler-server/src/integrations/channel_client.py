"""
这个模块负责从 scheduler-server 调用 channel。
第一阶段所有到 channel 的出站调用都应集中在这里。
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from src.core.config import settings
from src.core.security import build_channel_canonical_string, hmac_sha256_hex, new_nonce, now_ms, sha256_hex
from src.models.openclaw_instance import OpenClawInstance


class ChannelClient:
    async def send_inbound(self, *, instance: OpenClawInstance, payload: dict[str, Any]) -> dict[str, Any]:
        """
        把调度中心的一条消息转发给对应 OpenClaw 实例上的 channel。

        注意：
        1. 这里的签名规则要和 channel 插件侧完全一致。
        2. 当前远程 OpenClaw 使用的是自签证书 HTTPS，所以 verify 是否开启由配置决定。
        """
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        timestamp_ms = now_ms()
        nonce = new_nonce()
        path = "/claw-team/v1/inbound"
        canonical = build_channel_canonical_string(
            timestamp_ms=timestamp_ms,
            nonce=nonce,
            method="POST",
            path=path,
            body_sha256_hex=sha256_hex(body),
        )
        signature = hmac_sha256_hex(instance.channel_signing_secret, canonical)
        headers = {
            "content-type": "application/json; charset=utf-8",
            "x-oc-accountid": instance.channel_account_id,
            "x-oc-timestamp": str(timestamp_ms),
            "x-oc-nonce": nonce,
            "x-oc-signature": signature,
        }
        url = instance.channel_base_url.rstrip("/") + path
        # 第一阶段联调优先保证链路跑通。
        # 如果目标 channel 使用了内网自签证书，可以通过环境变量关闭 TLS 校验。
        async with httpx.AsyncClient(
            timeout=15.0,
            verify=not settings.channel_allow_insecure_tls,
        ) as client:
            response = await client.post(url, content=body, headers=headers)
        response.raise_for_status()
        return response.json()


channel_client = ChannelClient()
