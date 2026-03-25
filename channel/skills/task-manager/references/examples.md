# Task Skill Examples

This document provides standard Task Manager Skill examples for future Agent integrations.

## 1. Confirmation Example Before Task Creation

User input:

```text
Please clean up the login module. I want to continue building on it afterward.
```

Suggested Agent reply:

```text
I understand your goal as turning the login module into work that can be continued smoothly.

I suggest starting with 3 tasks:

1. Refactor login page interaction and form validation
2. Add login API error-code mapping and user-facing error messages
3. Add test coverage for the login module

Assigned to:
- Task 1: the current Agent
- Task 2: the current Agent
- Task 3: the current Agent

If you confirm, I will record these tasks in the Claw Team task system.
```

## 2. create_tasks Input Example

```json
{
  "tasks": [
    {
      "title": "Refactor login page interaction and form validation",
      "description": "Improve input feedback, submit states, error messaging, and validation logic so desktop and mobile behavior stay consistent.",
      "priority": "high",
      "tags": ["frontend", "login"],
      "assignee": {
        "instance_id": 1,
        "agent_id": 2
      }
    },
    {
      "title": "Add login API error-code mapping and user-facing error messages",
      "description": "Align login API error codes with clear UI copy so users do not see ambiguous failure states.",
      "priority": "medium",
      "tags": ["api", "login"],
      "assignee": {
        "instance_id": 1,
        "agent_id": 2
      }
    }
  ],
  "reason": "The owner confirmed that the login work should be decomposed into tasks and recorded in the system."
}
```

## 3. create_tasks CLI Example

```bash
python3 channel/skills/task-manager/scripts/task_api.py create_tasks --input payload.json
```

If you also want a user-ready summary:

```bash
python3 channel/skills/task-manager/scripts/task_flow.py create_tasks --input payload.json
```

Successful output example:

```json
{
  "created": [
    {
      "task_id": 101,
      "title": "Refactor login page interaction and form validation",
      "status": "in_progress",
      "assignee": {
        "instance_id": 1,
        "instance_name": "OpenClaw Main",
        "agent_id": 2,
        "agent_name": "Current Agent"
      }
    }
  ]
}
```

## 4. Recommended Reply After Creation

```text
I created 2 tasks for you:

1. Refactor login page interaction and form validation (current Agent, in progress)
2. Add login API error-code mapping and user-facing error messages (current Agent, in progress)

I can keep following up on one of them, or continue breaking down the work if needed.
```

## 5. append_task_comment Input Example

```json
{
  "task_id": 101,
  "comment": "Login form rules are organized. I am now refining the error-message styling.",
  "author_type": "agent"
}
```

CLI:

```bash
python3 channel/skills/task-manager/scripts/task_api.py append_task_comment --input payload.json
```

or:

```bash
python3 channel/skills/task-manager/scripts/task_flow.py append_task_comment --input payload.json
```

Recommended reply:

```text
I synced the latest progress to the task system:
"Login form rules are organized. I am now refining the error-message styling."

I also reported the update back in Claw Team chat.
```

## 6. list_tasks Input Example

```json
{
  "status": "in_progress",
  "keyword": "login",
  "limit": 10
}
```

Recommended reply:

```text
I found 2 in-progress tasks related to "login":

1. Refactor login page interaction and form validation
2. Add login API error-code mapping and user-facing error messages
```

## 7. complete_task Input Example

```json
{
  "task_id": 101,
  "comment": "The login-page interaction and validation work is complete and verified."
}
```

Recommended reply:

```text
I marked "Refactor login page interaction and form validation" as completed,
and synced this completion note: the login-page interaction and validation work is complete and verified.

I also reported the completion back in Claw Team chat.
```

## 8. terminate_task Input Example

```json
{
  "task_id": 101,
  "comment": "The direction has changed, so this task should not continue."
}
```

Recommended reply:

```text
I marked this task as terminated,
because the direction has changed and it should not continue.
```

## 9. Error Handling Example

If the script returns an error JSON payload:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "`task_id` is required"
  }
}
```

The Agent should not dump the raw JSON to the user. A better paraphrase is:

```text
This cannot be completed yet because the task ID is missing. I will first confirm which task you mean, then continue.
```

## 10. preview_create Example

```bash
python3 channel/skills/task-manager/scripts/task_flow.py preview_create --input payload.json
```

The output includes both:
- `preview`
- `user_message`

The `user_message` can be used directly as a candidate confirmation reply.
