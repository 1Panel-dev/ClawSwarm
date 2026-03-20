"""
本地开发启动脚本。
它会优先读取 .env.dev，然后启动 uvicorn。
"""
from __future__ import annotations

import os
from pathlib import Path

import uvicorn


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def main() -> None:
    root = Path(__file__).resolve().parent
    load_env_file(root / ".env.dev")
    host = os.getenv("APP_HOST", "127.0.0.1")
    port = int(os.getenv("APP_PORT", "8080"))
    uvicorn.run("src.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
