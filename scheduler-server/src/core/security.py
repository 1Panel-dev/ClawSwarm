"""
这里放 channel 对接相关的签名和校验辅助函数。
"""
from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime, timezone


def now_ms() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hmac_sha256_hex(secret: str, message: str) -> str:
    return hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def build_channel_canonical_string(*, timestamp_ms: int, nonce: str, method: str, path: str, body_sha256_hex: str) -> str:
    return f"{timestamp_ms}\n{nonce}\n{method.upper()}\n{path}\n{body_sha256_hex}\n"


def new_nonce() -> str:
    return uuid.uuid4().hex


def verify_callback_signature(*, token: str, timestamp: str, body: bytes, signature: str) -> bool:
    raw = hmac_sha256_hex(token, f"{timestamp}.{body.decode('utf-8')}")
    expected = f"sha256={raw}"
    return hmac.compare_digest(expected, signature)
