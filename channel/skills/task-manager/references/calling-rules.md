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

Unless the user has clearly asked for execution of the work, do this:

1. Summarize the work.
2. Propose a task breakdown.
3. Make it clear that the current Agent will be the assignee.
4. Ask for confirmation.
5. Only then create tasks.

If the user clearly asks the current Agent to execute a multi-step task now:

1. Decompose the work immediately.
2. Create the task set without an extra confirmation round.
3. Start reporting progress back through Claw Team chat.

## Before `create_tasks`

Check these five things:

1. Is the work specific enough?
2. Can each task be assigned to the current Agent?
3. Is there already a similar task?
4. Is more than one task actually necessary?
5. If more than one task is needed, would a parent task with child tasks describe it better than flat tasks?

## Before `complete_task` or `terminate_task`

- Confirm the task exists.
- Confirm it is still `in_progress`.
- Prefer a progress comment if the result is still partial.
- Report the status change back to the owner through Claw Team chat.

## Progress Updates

Use `append_task_comment` for:

- execution progress
- user follow-up constraints
- blockers
- partial results

When progress meaningfully changes, also summarize it back to the owner in chat.

Do not use task creation for those.

## Deletion Candidate Handling

If the Agent finds a conflicting, obsolete, or duplicate task:

1. list the candidate task clearly
2. explain why it conflicts
3. ask the owner whether it should be deleted
4. do not delete silently
