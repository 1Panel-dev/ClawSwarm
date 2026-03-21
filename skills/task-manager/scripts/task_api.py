#!/usr/bin/env python3
"""
Task Manager skill helper.

This script provides a deterministic bridge from the skill to scheduler-server.
It intentionally stays narrow in scope and only covers first-stage task actions.

Usage examples:

    python3 scripts/task_api.py create_tasks --input payload.json
    cat payload.json | python3 scripts/task_api.py list_tasks
    python3 scripts/task_api.py complete_task --input payload.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


DEFAULT_BASE_URL = "http://127.0.0.1:8080"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Call Claw Team scheduler-server task APIs.")
    parser.add_argument(
        "action",
        choices=[
            "create_tasks",
            "list_tasks",
            "append_task_comment",
            "complete_task",
            "terminate_task",
        ],
        help="Task action to execute.",
    )
    parser.add_argument("--input", help="Optional JSON file path. If omitted, read JSON from stdin when available.")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SCHEDULER_SERVER_BASE_URL", DEFAULT_BASE_URL),
        help="scheduler-server base URL. Defaults to SCHEDULER_SERVER_BASE_URL or http://127.0.0.1:8080",
    )
    return parser.parse_args()


def load_payload(path: str | None) -> dict[str, Any]:
    if path:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read().strip()
            return json.loads(raw) if raw else {}

    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        return json.loads(raw) if raw else {}

    return {}


def request_json(method: str, url: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
    body = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url=url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            detail = json.loads(raw)
        except Exception:
            detail = {"message": raw or exc.reason}
        raise SystemExit(
            json.dumps(
                {
                    "error": {
                        "code": f"HTTP_{exc.code}",
                        "message": "scheduler-server request failed",
                        "detail": detail,
                    }
                },
                ensure_ascii=False,
            )
        )
    except urllib.error.URLError as exc:
        raise SystemExit(
            json.dumps(
                {
                    "error": {
                        "code": "NETWORK_ERROR",
                        "message": f"failed to reach scheduler-server: {exc.reason}",
                    }
                },
                ensure_ascii=False,
            )
        )


def action_create_tasks(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    tasks = payload.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise SystemExit(json.dumps({"error": {"code": "INVALID_INPUT", "message": "`tasks` must be a non-empty array"}}, ensure_ascii=False))

    created: list[dict[str, Any]] = []
    for item in tasks:
        assignee = item.get("assignee") or {}
        response = request_json(
            "POST",
            f"{base_url}/api/tasks",
            {
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "priority": item.get("priority", "medium"),
                "tags": item.get("tags", []),
                "assignee_instance_id": assignee.get("instance_id"),
                "assignee_agent_id": assignee.get("agent_id"),
            },
        )
        created.append(
            {
                "task_id": response["id"],
                "title": response["title"],
                "status": response["status"],
                "assignee": response["assignee"],
            }
        )
    return {"created": created}


def action_list_tasks(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    params = {
        "status": payload.get("status", "all"),
        "keyword": payload.get("keyword", ""),
    }
    url = f"{base_url}/api/tasks?{urllib.parse.urlencode(params)}"
    items = request_json("GET", url)
    if not isinstance(items, list):
        raise SystemExit(json.dumps({"error": {"code": "INVALID_RESPONSE", "message": "expected task list"}}, ensure_ascii=False))
    return {"items": items[: int(payload.get("limit", 20))]}


def action_append_task_comment(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    task_id = payload.get("task_id")
    comment = payload.get("comment")
    if not task_id:
        raise SystemExit(json.dumps({"error": {"code": "INVALID_INPUT", "message": "`task_id` is required"}}, ensure_ascii=False))
    if not comment or not str(comment).strip():
        raise SystemExit(json.dumps({"error": {"code": "INVALID_INPUT", "message": "`comment` is required"}}, ensure_ascii=False))
    response = request_json(
        "POST",
        f"{base_url}/api/tasks/{task_id}/comments",
        {
            "comment": str(comment).strip(),
            "author_type": payload.get("author_type", "agent"),
        },
    )
    return {
        "task_id": response["task_id"],
        "comment_count": response["comment_count"],
        "latest_entry": response["latest_entry"],
    }


def action_complete_task(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    task_id = payload.get("task_id")
    if not task_id:
        raise SystemExit(json.dumps({"error": {"code": "INVALID_INPUT", "message": "`task_id` is required"}}, ensure_ascii=False))
    response = request_json("POST", f"{base_url}/api/tasks/{task_id}/complete", {"comment": payload.get("comment")})
    return {
        "task_id": response["id"],
        "status": response["status"],
        "ended_at": response["ended_at"],
    }


def action_terminate_task(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    task_id = payload.get("task_id")
    if not task_id:
        raise SystemExit(json.dumps({"error": {"code": "INVALID_INPUT", "message": "`task_id` is required"}}, ensure_ascii=False))
    response = request_json("POST", f"{base_url}/api/tasks/{task_id}/terminate", {"comment": payload.get("comment")})
    return {
        "task_id": response["id"],
        "status": response["status"],
        "ended_at": response["ended_at"],
    }


def main() -> None:
    args = parse_args()
    payload = load_payload(args.input)
    base_url = args.base_url.rstrip("/")

    if args.action == "create_tasks":
        result = action_create_tasks(base_url, payload)
    elif args.action == "list_tasks":
        result = action_list_tasks(base_url, payload)
    elif args.action == "append_task_comment":
        result = action_append_task_comment(base_url, payload)
    elif args.action == "complete_task":
        result = action_complete_task(base_url, payload)
    else:
        result = action_terminate_task(base_url, payload)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
