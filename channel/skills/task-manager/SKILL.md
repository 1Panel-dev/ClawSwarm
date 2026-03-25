---
name: task-manager
description: Use this skill when a user asks an Agent to turn multi-step work into tracked tasks, or when the Agent needs to query, comment on, complete, or terminate tasks while reporting progress back through Claw Team chat. Do not use it for ordinary Q&A or one-off answers.
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

Follow this workflow unless the user has already clearly switched into execution mode:

1. Decide whether the request should become tasks at all.
2. If it should, decide whether one task is enough or whether the work needs a parent task with child tasks.
3. Decompose the work into clear, single-purpose tasks.
4. Assign every task to the current Agent itself.
5. If the user is still discussing or refining the request, present the task draft and ask for confirmation.
6. If the user has already clearly asked the Agent to execute a multi-step task, create the tasks immediately.
7. During execution, append progress comments instead of constantly rewriting task fields.
8. Report meaningful progress and completion updates back to the owner through Claw Team chat.
9. Only mark tasks completed or terminated when the state is truly clear.

First-stage default:

- Prefer **confirm first, then create**.
- If the user clearly requests execution of a multi-step task, **decompose and create immediately**.
- Support **at most two levels**: parent task and child task.
- Every child task must already be a **smallest executable unit** and must not be split again.
- Every task must be assigned to **the current Agent itself**.
- If a conflicting or obsolete task is found, surface it to the human owner and ask whether it should be deleted.

## Skill Actions

This skill currently assumes five actions:

1. `create_tasks`
2. `list_tasks`
3. `append_task_comment`
4. `complete_task`
5. `terminate_task`
6. `delete_task`

For the JSON contract, read:

- [references/json-contract.md](./references/json-contract.md)

## Decision Rules

Before creating tasks, always check:

1. Is the request specific enough to become tracked work?
2. Can each task be assigned to the current Agent?
3. Is there already a similar task in the system?
4. Does this need one task, or a parent task with child tasks?
5. Has the user clearly asked to execute the work now, or is confirmation still required?

For the detailed rules, read:

- [references/calling-rules.md](./references/calling-rules.md)

## Task Decomposition Rules

When splitting work into tasks:

- Keep each task focused on one main outcome.
- Use a parent task only when one goal naturally contains several concrete deliverables.
- Keep child tasks small enough to execute directly; do not create a third level.
- Use action-oriented titles.
- Put scope, constraints, and expected output into the description.
- Use 0-3 tags only.
- Default priority to `medium` unless there is a clear reason otherwise.
- Assign every task to the current Agent that is holding the conversation.

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

- Multi-agent automatic orchestration
- Arbitrary full-field task updates
- Approval workflow
- Complex permission model

Keep the system conservative and auditable first.

Notes for the current stage:

- Parent/child is allowed, but only up to two levels.
- Deletion is not a silent action. The Agent should identify conflicting tasks and ask the human owner for confirmation before removal.
