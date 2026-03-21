# Agent Calling Rules

This file defines when an Agent should or should not use the Task Manager skill.

## Use The Skill When

- The user explicitly asks to create, split, or record tasks.
- The request is a multi-step or trackable piece of work.
- The Agent needs to query tasks before creating or updating them.
- The Agent needs to append progress, complete, or terminate an existing task.

## Do Not Use The Skill When

- The user is asking for quick explanation or advice only.
- The conversation is still at an exploratory stage.
- The request is too vague to assign to a specific Agent.

## Default First-Stage Behavior

Unless the user clearly says “create it now”, do this:

1. Summarize the work.
2. Propose a task breakdown.
3. Propose an assignee for each task.
4. Ask for confirmation.
5. Only then create tasks.

## Before `create_tasks`

Check these four things:

1. Is the work specific enough?
2. Can each task be assigned to one concrete Agent?
3. Is there already a similar task?
4. Is more than one task actually necessary?

## Before `complete_task` or `terminate_task`

- Confirm the task exists.
- Confirm it is still `in_progress`.
- Prefer a progress comment if the result is still partial.

## Progress Updates

Use `append_task_comment` for:

- execution progress
- user follow-up constraints
- blockers
- partial results

Do not use task creation for those.
