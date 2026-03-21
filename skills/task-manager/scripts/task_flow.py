#!/usr/bin/env python3
"""
Task Manager conversational workflow helper.

This script sits one layer above task_api.py. It is designed for future Agent
integration, where the caller does not only need raw task-system JSON, but also
needs a normalized user-facing summary.

The script does not try to do LLM decomposition on its own. It assumes the
caller already has a structured payload and wants one of these outcomes:

1. preview task creation before user confirmation
2. execute task creation and get a natural-language summary
3. append progress and get a natural-language summary
4. complete / terminate tasks and get a natural-language summary
5. list tasks and get a short natural-language summary
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import task_api  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Task Manager workflow helper for Agent integration.")
    parser.add_argument(
        "action",
        choices=[
            "preview_create",
            "create_tasks",
            "list_tasks",
            "append_task_comment",
            "complete_task",
            "terminate_task",
        ],
        help="Workflow action to execute.",
    )
    parser.add_argument("--input", help="Optional JSON file path. If omitted, read JSON from stdin when available.")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SCHEDULER_SERVER_BASE_URL", task_api.DEFAULT_BASE_URL),
        help="scheduler-server base URL. Defaults to SCHEDULER_SERVER_BASE_URL or http://127.0.0.1:8080",
    )
    return parser.parse_args()


def load_payload(path: str | None) -> dict[str, Any]:
    return task_api.load_payload(path)


def _normalize_tasks(payload: dict[str, Any]) -> list[dict[str, Any]]:
    tasks = payload.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise SystemExit(json.dumps({"error": {"code": "INVALID_INPUT", "message": "`tasks` must be a non-empty array"}}, ensure_ascii=False))
    return tasks


def _assignee_label(item: dict[str, Any]) -> str:
    assignee = item.get("assignee") or {}
    agent_name = assignee.get("agent_name")
    if agent_name:
        return str(agent_name)
    agent_id = assignee.get("agent_id")
    if agent_id is not None:
        return f"Agent #{agent_id}"
    return "待确认执行 Agent"


def action_preview_create(payload: dict[str, Any]) -> dict[str, Any]:
    tasks = _normalize_tasks(payload)
    lines = [f"我建议拆成 {len(tasks)} 个任务：", ""]
    for index, item in enumerate(tasks, start=1):
        lines.append(f"{index}. {item.get('title', '').strip() or '未命名任务'}（{_assignee_label(item)}）")
    lines.extend(["", "如果你确认，我就把这些任务录入 Claw Team 任务系统。"])
    return {
        "preview": {
            "count": len(tasks),
            "tasks": [
                {
                    "title": item.get("title", "").strip(),
                    "assignee": _assignee_label(item),
                    "priority": item.get("priority", "medium"),
                }
                for item in tasks
            ],
        },
        "user_message": "\n".join(lines),
    }


def action_create_tasks(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_create_tasks(base_url, payload)
    created = result.get("created", [])
    lines = [f"已为你创建 {len(created)} 个任务：", ""]
    for index, item in enumerate(created, start=1):
        assignee = item.get("assignee") or {}
        assignee_name = assignee.get("agent_name") or assignee.get("agent_id") or "未指定"
        lines.append(f"{index}. {item.get('title', '未命名任务')}（{assignee_name}，{item.get('status', 'unknown')}）")
    lines.extend(["", "你可以继续让我跟进其中某一项，或者去任务页查看进度。"])
    result["user_message"] = "\n".join(lines)
    return result


def action_list_tasks(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_list_tasks(base_url, payload)
    items = result.get("items", [])
    keyword = str(payload.get("keyword", "")).strip()
    status = str(payload.get("status", "all")).strip()
    if not items:
        result["user_message"] = f"当前没有查到与“{keyword or '全部'}”相关、状态为“{status}”的任务。"
        return result

    lines = [f"我查到 {len(items)} 个任务：", ""]
    for index, item in enumerate(items, start=1):
        assignee = item.get("assignee") or {}
        assignee_name = assignee.get("agent_name") or assignee.get("agent_id") or "未指定"
        lines.append(f"{index}. {item.get('title', '未命名任务')}（{assignee_name}，{item.get('status', 'unknown')}）")
    result["user_message"] = "\n".join(lines)
    return result


def action_append_task_comment(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_append_task_comment(base_url, payload)
    latest = result.get("latest_entry", {})
    comment = latest.get("body") or payload.get("comment", "")
    result["user_message"] = f"我已经把最新进展同步到任务系统：\n“{comment}”"
    return result


def action_complete_task(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_complete_task(base_url, payload)
    result["user_message"] = f"我已经把任务 #{result.get('task_id')} 标记为已完成。"
    return result


def action_terminate_task(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_terminate_task(base_url, payload)
    result["user_message"] = f"我已经把任务 #{result.get('task_id')} 标记为已终止。"
    return result


def main() -> None:
    args = parse_args()
    payload = load_payload(args.input)
    base_url = args.base_url.rstrip("/")

    if args.action == "preview_create":
        result = action_preview_create(payload)
    elif args.action == "create_tasks":
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
