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
            "delete_task",
        ],
        help="Workflow action to execute.",
    )
    parser.add_argument("--input", help="Optional JSON file path. If omitted, read JSON from stdin when available.")
    parser.add_argument(
        "--base-url",
        default=task_api.resolve_base_url(),
        help="scheduler-server base URL. Defaults to SCHEDULER_SERVER_BASE_URL, claw-team.baseUrl in openclaw.json, or http://127.0.0.1:8080",
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
    return "Current Agent (pending confirmation)"


def _task_title(item: dict[str, Any]) -> str:
    return item.get("title", "").strip() or "Untitled task"


def _append_preview_lines(lines: list[str], item: dict[str, Any], index: int) -> None:
    # 预览阶段把父任务和子任务都展开出来，
    # 这样主人在确认前就能看见最终会被创建的层级结构。
    lines.append(f"{index}. {_task_title(item)} ({_assignee_label(item)})")
    children = item.get("children") or []
    for child_index, child in enumerate(children, start=1):
        child_title = str(child.get("title", "")).strip() or "Untitled child task"
        lines.append(f"   {index}.{child_index} {child_title} ({_assignee_label(item)})")


def action_preview_create(payload: dict[str, Any]) -> dict[str, Any]:
    tasks = _normalize_tasks(payload)
    lines = [f"I suggest breaking this into {len(tasks)} task groups:", ""]
    for index, item in enumerate(tasks, start=1):
        _append_preview_lines(lines, item, index)
    lines.extend(["", "If you confirm, I will record these tasks in the Claw Team task system."])
    return {
        "preview": {
            "count": len(tasks),
            "tasks": [
                {
                    "title": _task_title(item),
                    "assignee": _assignee_label(item),
                    "priority": item.get("priority", "medium"),
                    "children": [
                        {
                            "title": str(child.get("title", "")).strip() or "Untitled child task",
                            "priority": child.get("priority", "medium"),
                        }
                        for child in (item.get("children") or [])
                    ],
                }
                for item in tasks
            ],
        },
        "user_message": "\n".join(lines),
    }


def action_create_tasks(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_create_tasks(base_url, payload)
    created = result.get("created", [])
    lines = [f"I created {len(created)} top-level tasks for you:", ""]
    for index, item in enumerate(created, start=1):
        assignee = item.get("assignee") or {}
        assignee_name = assignee.get("agent_name") or assignee.get("agent_id") or "Unassigned"
        lines.append(f"{index}. {item.get('title', 'Untitled task')} ({assignee_name}, {item.get('status', 'unknown')})")
        # 创建结果里如果有子任务，也顺手一起总结给调用方，
        # 这样 Agent 回报给主人时不需要自己再拼装层级文案。
        for child_index, child in enumerate(item.get("children", []), start=1):
            child_assignee = child.get("assignee") or {}
            child_assignee_name = child_assignee.get("agent_name") or child_assignee.get("agent_id") or assignee_name
            lines.append(
                f"   {index}.{child_index} {child.get('title', 'Untitled child task')} ({child_assignee_name}, {child.get('status', 'unknown')})"
            )
    lines.extend(["", "I can keep following up on any of them, or you can review progress on the task page."])
    result["user_message"] = "\n".join(lines)
    return result


def action_list_tasks(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_list_tasks(base_url, payload)
    items = result.get("items", [])
    keyword = str(payload.get("keyword", "")).strip()
    status = str(payload.get("status", "all")).strip()
    if not items:
        result["user_message"] = f'I could not find any tasks matching "{keyword or "all"}" with status "{status}".'
        return result

    lines = [f"I found {len(items)} tasks:", ""]
    for index, item in enumerate(items, start=1):
        assignee = item.get("assignee") or {}
        assignee_name = assignee.get("agent_name") or assignee.get("agent_id") or "Unassigned"
        lines.append(f"{index}. {item.get('title', 'Untitled task')} ({assignee_name}, {item.get('status', 'unknown')})")
        for child_index, child in enumerate(item.get("children", []), start=1):
            child_assignee = child.get("assignee") or {}
            child_assignee_name = child_assignee.get("agent_name") or child_assignee.get("agent_id") or assignee_name
            lines.append(
                f"   {index}.{child_index} {child.get('title', 'Untitled child task')} ({child_assignee_name}, {child.get('status', 'unknown')})"
            )
    result["user_message"] = "\n".join(lines)
    return result


def action_append_task_comment(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_append_task_comment(base_url, payload)
    latest = result.get("latest_entry", {})
    comment = latest.get("content") or payload.get("comment", "")
    result["user_message"] = f'I synced the latest progress to the task system:\n"{comment}"\n\nI also reported this update back in Claw Team chat.'
    return result


def action_complete_task(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_complete_task(base_url, payload)
    result["user_message"] = f'I marked task #{result.get("task_id")} as completed.\n\nI also reported the completion back in Claw Team chat.'
    return result


def action_terminate_task(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_terminate_task(base_url, payload)
    result["user_message"] = f'I marked task #{result.get("task_id")} as terminated.'
    return result


def action_delete_task(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    result = task_api.action_delete_task(base_url, payload)
    deleted_child_count = int(result.get("deleted_child_count", 0))
    if deleted_child_count > 0:
        result["user_message"] = (
            f'I deleted task #{result.get("task_id")} and {deleted_child_count} direct child task(s) after explicit confirmation.'
        )
    else:
        result["user_message"] = f'I deleted task #{result.get("task_id")} after explicit confirmation.'
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
    elif args.action == "terminate_task":
        result = action_terminate_task(base_url, payload)
    else:
        result = action_delete_task(base_url, payload)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
