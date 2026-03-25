# Task Manager JSON Contract

This file defines the suggested JSON contract for the Task Manager skill.

## Supported Actions

- `create_tasks`
- `list_tasks`
- `append_task_comment`
- `complete_task`
- `terminate_task`
- `delete_task`

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
      "title": "Refactor login page interaction and validation",
      "description": "Improve login-page input feedback, submit states, and error messages so mobile and desktop behavior stay consistent.",
      "priority": "high",
      "tags": ["frontend", "login"],
      "assignee": {
        "instance_id": 1,
        "agent_id": 2
      }
    }
  ],
  "reason": "The owner confirmed that this request should be decomposed into tasks and recorded in the system."
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
      "title": "Refactor login page interaction and validation",
      "status": "in_progress",
      "assignee": {
        "instance_id": 1,
        "instance_name": "OpenClaw Main",
        "agent_id": 2,
        "agent_name": "Engineer"
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
  "keyword": "login",
  "limit": 20
}
```

### Output

```json
{
  "items": [
    {
      "task_id": "task_abc123",
      "title": "Refactor login page interaction and validation",
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
  "comment": "Validation rules are organized. I am now refining the error message styling.",
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
    "label": "Agent Update",
    "content": "Validation rules are organized. I am now refining the error message styling.",
    "at": "2026-03-21T13:20:00+08:00"
  }
}
```

## complete_task

### Input

```json
{
  "task_id": "task_abc123",
  "comment": "The task is complete. The related page and validation logic have been updated."
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
  "comment": "The direction has changed, so this task is being stopped."
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

## delete_task

### Input

```json
{
  "task_id": "task_abc123"
}
```

### Output

```json
{
  "task_id": "task_abc123",
  "deleted": true,
  "deleted_child_count": 2
}
```

## First-Stage Exclusions

Do not include these yet:

- `update_task`
- `assign_task`
- `accept_task`
