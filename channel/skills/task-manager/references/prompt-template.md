# Task Skill Prompt Template

Use this template when wiring the Task Manager Skill into a specific Agent.

## 1. System Guidance Template

```text
Use the Task Manager Skill when the user asks for work that should be tracked over time, executed across multiple steps, or written into the task system.

Default rules:
1. First decide whether the request actually needs task tracking.
2. By default, show a task breakdown draft and ask for confirmation before creating tasks.
3. If the owner has clearly asked to execute a multi-step piece of work, decompose it and call `create_tasks` immediately.
4. Tasks may be either one standalone task or one parent task with child tasks. Do not create a third level.
5. Every task must be assigned to the current Agent handling the conversation.
6. Child tasks must already be small enough to execute directly. Do not keep decomposing them.
7. Titles should be short and action-oriented. Descriptions should include scope, constraints, and expected output.
8. During execution, prefer `append_task_comment` for progress updates instead of repeatedly rewriting the task body.
9. Use `complete_task` or `terminate_task` only when the state is unambiguous.
10. If progress changes materially or a task is completed, report that update back to the owner through Claw Team chat.
11. If a conflicting or obsolete task may need deletion, raise it to the owner and ask for explicit confirmation before deleting.
12. Do not dump raw JSON to the user unless they explicitly ask for it.
```

## 2. Agent Internal Checklist

Before calling the skill, the Agent should check:

- Is this tracked work, or just a question that should be answered directly?
- Is the goal clear enough to decompose into actionable tasks?
- Is the owner explicitly asking for execution right now?
- Should this be one task, or one parent task with child tasks?
- Are all tasks assignable to the current Agent?
- If confirmation is required, has the owner already given it?

## 3. Create Flow Template

```text
I understand your goal as: {goal}

I suggest breaking it into {count} tasks:
1. {task_1_title}
2. {task_2_title}
3. {task_3_title}

Assigned to:
- {task_1_assignee}
- {task_2_assignee}
- {task_3_assignee}

If you confirm, I will record these tasks in the Claw Team task system.
```

## 4. Success Response Template

```text
I created {count} tasks for you:

1. {title_1} ({assignee_1}, {status_1})
2. {title_2} ({assignee_2}, {status_2})

I can keep following up on any of them, or you can check progress on the task page.
```

## 5. Progress Comment Template

```text
I synced the latest progress to the task system:
"{comment}"

I also reported the update back to you here in Claw Team chat.
```

## 6. Completion Template

```text
I marked "{title}" as completed.
Result summary: {result_summary}

I also reported the completion back to you here in Claw Team chat.
```

## 7. Termination Template

```text
I marked "{title}" as terminated.
Reason: {reason}
```

## 8. Deletion Confirmation Template

```text
I found an existing task that appears to conflict with the current plan:
- {task_title}

Why it may need deletion:
- {reason}

If you want, I can delete it after your explicit confirmation.
```
