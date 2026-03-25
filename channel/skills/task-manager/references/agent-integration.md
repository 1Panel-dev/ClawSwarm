# Agent Integration Guide

This file explains how an Agent should actually use the Task Manager skill in conversation.

## 1. Goal

The Agent should not treat task creation as a hidden side effect.

Instead, the Agent should:

1. understand the user's request
2. decide whether it should become tracked work
3. decide whether one task is enough or whether parent + child tasks are needed
4. keep every task assigned to itself
5. propose a task breakdown unless the user already clearly asked to execute now
6. ask for confirmation unless the user already clearly asked to create tasks now
7. report progress and completion back to the owner through Claw Team chat
8. if it finds conflicting tasks, ask the owner whether deletion is desired before taking any removal action
9. call the Task Manager skill
10. summarize the creation result back to the user

## 2. Recommended Decision Flow

Use this flow in order:

### Step 1: classify the request

Ask internally:

- Is this a question to answer now?
- Or is this a piece of work to track?

If it is just a question, do not invoke the skill.

### Step 2: check whether the work is concrete enough

If the user request is too vague, ask a clarifying question before creating tasks.

Examples of vague requests:

- "Optimize the system a bit."
- "See what else can be done."

### Step 3: decide task shape

If there is one clear outcome, use one task.

If there are several concrete deliverables under one goal, use one parent task with child tasks.

Do not create a third level.

Child tasks must already be the smallest executable unit.

### Step 4: decide whether confirmation is required

Confirmation is required by default unless the user has already clearly said:

- "Create them directly."
- "Record them now."
- "Break it down like this and create tasks."
- "Start working on it now."
- "Go execute it."

If the user is clearly asking for execution of a multi-step task, the Agent may decompose and create tasks immediately.

### Step 5: invoke the skill

Use the helper script behind the skill or equivalent integration wrapper.

Preferred wrapper for conversational use:

```bash
python3 channel/skills/task-manager/scripts/task_flow.py preview_create --input payload.json
```

Use `task_flow.py` when the Agent needs a ready-made `user_message` in addition to the raw result.

### Step 6: summarize the result

Always report:

- how many tasks were created
- titles
- assignees
- current status

## 3. Recommended Prompt Behavior

When the user has not yet confirmed creation, use a response pattern like this:

### Example

> I understand your goal as fully tightening up the login module and making sure the page interaction, API error handling, and test coverage are all in place.  
> I suggest breaking it into 3 tasks:
>
> 1. Refactor login page interaction and validation
> 2. Add login API error-code mapping
> 3. Add login module test coverage
>
> I will own and execute all of these tasks myself first.
>
> If you confirm, I will record these tasks in the Claw Team task system.

## 4. Recommended Invocation Payload Shape

When confirmed, the Agent should prepare a payload like:

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
  "reason": "The owner confirmed that the request should be decomposed into tasks and recorded in the system."
}
```

## 5. Suggested Local Invocation Style

If the Agent environment can run local commands, a good pattern is:

```bash
python3 channel/skills/task-manager/scripts/task_api.py create_tasks --input payload.json
```

or via stdin:

```bash
cat payload.json | python3 channel/skills/task-manager/scripts/task_api.py create_tasks
```

For the more conversational wrapper:

```bash
python3 channel/skills/task-manager/scripts/task_flow.py create_tasks --input payload.json
```

The same pattern applies to:

- `list_tasks`
- `append_task_comment`
- `complete_task`
- `terminate_task`

## 6. How To Report Success

After `create_tasks`, the Agent should not dump raw JSON unless the user explicitly wants raw data.

Preferred summary style:

> I created 3 tasks for you:
>
> 1. Refactor login page interaction and validation (current Agent, in progress)
> 2. Add login API error-code mapping (current Agent, in progress)
> 3. Add login module test coverage (current Agent, in progress)
>
> I can keep following up on any of them, or you can check progress on the task page.

## 7. How To Report Progress

When using `append_task_comment`, the Agent should summarize the meaning of the update, not just say "a comment was appended".

Preferred style:

> I synced the latest progress to the task system:  
> "Validation rules are organized. I am now refining the error-message styling."

The Agent should also send this progress update back to the owner in the Claw Team conversation.

## 8. How To Report Completion

When using `complete_task`, the Agent should say both:

- the task is marked completed
- what result was delivered

The Agent should also send a clear completion update back to the owner in the Claw Team conversation.

## 9. Safety Rules

The Agent should not:

- create tasks silently without user awareness in the default path
- create tasks with no assignee
- assign tasks to another Agent silently in the first stage
- create vague titles
- duplicate tasks that are already in progress
- terminate tasks just because work is blocked temporarily
- delete conflicting tasks without explicit owner confirmation

## 10. First-Stage Recommendation

The cleanest first-stage behavior is:

1. suggest task breakdown
2. ask for confirmation
3. create tasks
4. append comments during progress
5. complete or terminate only when clearly justified

Execution-mode variant:

1. user clearly asks the current Agent to execute multi-step work
2. Agent decomposes and creates tasks immediately
3. Agent reports progress in both the task system and Claw Team chat
4. Agent reports completion back in Claw Team chat
