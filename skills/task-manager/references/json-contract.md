# Task Manager JSON Contract

This file defines the suggested JSON contract for the Task Manager skill.

## Supported Actions

- `create_tasks`
- `list_tasks`
- `append_task_comment`
- `complete_task`
- `terminate_task`

## Shared Enums

### status

- `in_progress`
- `completed`
- `terminated`

### priority

- `low`
- `medium`
- `high`
- `urgent`

## create_tasks

### Input

```json
{
  "tasks": [
    {
      "title": "重构登录页交互与校验",
      "description": "整理登录页输入反馈、提交态和错误提示，确保移动端和桌面端交互一致。",
      "priority": "high",
      "tags": ["前端", "登录"],
      "assignee": {
        "instance_id": 1,
        "agent_id": 2
      }
    }
  ],
  "reason": "用户确认将需求拆成任务并录入系统"
}
```

### Notes

- `tasks` is required and must contain at least one item.
- `title`, `description`, and `assignee` are required.
- `priority` defaults to `medium`.
- `tags` defaults to `[]`.

### Output

```json
{
  "created": [
    {
      "task_id": "task_abc123",
      "title": "重构登录页交互与校验",
      "status": "in_progress",
      "assignee": {
        "instance_id": 1,
        "instance_name": "OpenClaw 主节点",
        "agent_id": 2,
        "agent_name": "程序员"
      }
    }
  ]
}
```

## list_tasks

### Input

```json
{
  "status": "all",
  "keyword": "登录",
  "limit": 20
}
```

### Output

```json
{
  "items": [
    {
      "task_id": "task_abc123",
      "title": "重构登录页交互与校验",
      "status": "in_progress",
      "priority": "high",
      "updated_at": "2026-03-21T13:00:00+08:00"
    }
  ]
}
```

## append_task_comment

### Input

```json
{
  "task_id": "task_abc123",
  "comment": "已完成表单校验规则整理，正在处理错误提示样式。",
  "author_type": "agent"
}
```

### Output

```json
{
  "task_id": "task_abc123",
  "comment_count": 3,
  "latest_entry": {
    "type": "agent",
    "label": "Agent 更新",
    "content": "已完成表单校验规则整理，正在处理错误提示样式。",
    "at": "2026-03-21T13:20:00+08:00"
  }
}
```

## complete_task

### Input

```json
{
  "task_id": "task_abc123",
  "comment": "任务已完成，相关页面和校验逻辑已更新。"
}
```

### Output

```json
{
  "task_id": "task_abc123",
  "status": "completed",
  "ended_at": "2026-03-21T14:00:00+08:00"
}
```

## terminate_task

### Input

```json
{
  "task_id": "task_abc123",
  "comment": "需求方向变化，当前任务暂停。"
}
```

### Output

```json
{
  "task_id": "task_abc123",
  "status": "terminated",
  "ended_at": "2026-03-21T14:05:00+08:00"
}
```

## First-Stage Exclusions

Do not include these yet:

- `update_task`
- `delete_task`
- `assign_task`
- `accept_task`
- `create_subtasks`
