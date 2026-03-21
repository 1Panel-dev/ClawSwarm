---
name: task-manager
description: Use this skill when a user wants an Agent to turn a chat request into one or more actionable tasks in the Claw Team task system, or when the Agent needs to query, comment on, complete, or terminate existing tasks. Use it for task decomposition, task creation, and task lifecycle updates; do not use it for ordinary Q&A or one-off answers.
---

# Task Manager

## Overview

This skill helps an Agent convert user intent into tracked tasks in the Claw Team task system. It is for task-oriented conversations, not general chat.

## When To Use

Use this skill when one of these is true:

- The user explicitly asks to create tasks, split work into tasks, or record work into the task system.
- The user asks an Agent to carry out a multi-step or trackable piece of work.
- The Agent needs to look up existing tasks before deciding whether to create new ones.
- The Agent needs to append progress, complete a task, or terminate a task.

Do not use this skill when:

- The user is asking for explanation, advice, comparison, or quick troubleshooting only.
- The request can be answered in one reply and does not need tracking.
- The task scope is still too vague to assign to a specific Agent.

## Default Workflow

Follow this workflow unless the user explicitly says to create tasks immediately:

1. Decide whether the request should become tasks at all.
2. If it should, decompose the work into clear, single-purpose tasks.
3. Pick a specific Agent for each task.
4. Present the task draft to the user and ask for confirmation.
5. After confirmation, create the tasks in Claw Team.
6. During execution, append progress comments instead of constantly rewriting task fields.
7. Only mark tasks completed or terminated when the state is truly clear.

First-stage default:

- Prefer **confirm first, then create**.
- Prefer **flat tasks**, not parent/child tasks.
- Every task must be assigned to **one specific Agent**.

## Skill Actions

This skill currently assumes five actions:

1. `create_tasks`
2. `list_tasks`
3. `append_task_comment`
4. `complete_task`
5. `terminate_task`

For the JSON contract, read:

- [references/json-contract.md](./references/json-contract.md)

## Decision Rules

Before creating tasks, always check:

1. Is the request specific enough to become tracked work?
2. Can each task be assigned to one concrete Agent?
3. Is there already a similar task in the system?
4. Does this need multiple tasks, or would one task be enough?

For the detailed rules, read:

- [references/calling-rules.md](./references/calling-rules.md)

## Task Decomposition Rules

When splitting work into tasks:

- Keep each task focused on one main outcome.
- Use action-oriented titles.
- Put scope, constraints, and expected output into the description.
- Use 0-3 tags only.
- Default priority to `medium` unless there is a clear reason otherwise.

For the detailed decomposition guidance, read:

- [references/decomposition-guidelines.md](./references/decomposition-guidelines.md)

For the agent-side invocation strategy and prompt template, read:

- [references/agent-integration.md](./references/agent-integration.md)
- [references/prompt-template.md](./references/prompt-template.md)
- [references/examples.md](./references/examples.md)

## Integration Target

This skill is designed to operate against `scheduler-server`, not the frontend and not the SQLite file directly.

Preferred integration path:

- Skill -> HTTP -> `scheduler-server` task API

Do not write directly to the database from the skill.

Use the bundled helper script when you need deterministic API calls:

- [scripts/task_api.py](./scripts/task_api.py)
- [scripts/task_flow.py](./scripts/task_flow.py)

The script reads:

- `SCHEDULER_SERVER_BASE_URL` (default `http://127.0.0.1:8080`)

and accepts JSON input either from `--input <file>` or stdin.

Recommended usage split:

- Use `task_flow.py` when the Agent needs both machine-readable output and a user-facing summary.
- Use `task_api.py` when you only need the raw deterministic API bridge.

## First-Stage Boundaries

Do not add these in the first stage:

- Parent/child tasks
- Multi-agent automatic orchestration
- Arbitrary full-field task updates
- Delete task
- Approval workflow
- Complex permission model

Keep the system conservative and auditable first.
