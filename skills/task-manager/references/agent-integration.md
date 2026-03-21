# Agent Integration Guide

This file explains how an Agent should actually use the Task Manager skill in conversation.

## 1. Goal

The Agent should not treat task creation as a hidden side effect.

Instead, the Agent should:

1. understand the user's request
2. decide whether it should become tracked work
3. propose a task breakdown
4. ask for confirmation unless the user already clearly asked to create tasks now
5. call the Task Manager skill
6. summarize the creation result back to the user

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

- “优化一下系统”
- “帮我看看还能做什么”

### Step 3: decide whether one task or multiple tasks are needed

If there are multiple distinct outcomes, split them into flat tasks.

Do not create parent/child tasks in the first stage.

### Step 4: decide whether confirmation is required

Confirmation is required by default unless the user has already clearly said:

- “直接创建”
- “现在就录入”
- “按这个拆，建任务”

### Step 5: invoke the skill

Use the helper script behind the skill or equivalent integration wrapper.

Preferred wrapper for conversational use:

```bash
python3 skills/task-manager/scripts/task_flow.py preview_create --input payload.json
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

> 我理解你的目标是把登录模块收完整，并保证页面交互、接口错误处理和测试覆盖到位。  
> 我建议拆成 3 个任务：
>
> 1. 重构登录页交互与校验
> 2. 补登录接口错误码映射
> 3. 补登录模块测试用例
>
> 建议执行者：
> - 任务 1：程序员 Agent
> - 任务 2：程序员 Agent
> - 任务 3：测试类 Agent（如果当前没有，就先给程序员 Agent）
>
> 如果你确认，我就把这些任务录入 Claw Team 任务系统。

## 4. Recommended Invocation Payload Shape

When confirmed, the Agent should prepare a payload like:

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

## 5. Suggested Local Invocation Style

If the Agent environment can run local commands, a good pattern is:

```bash
python3 skills/task-manager/scripts/task_api.py create_tasks --input payload.json
```

or via stdin:

```bash
cat payload.json | python3 skills/task-manager/scripts/task_api.py create_tasks
```

For the more conversational wrapper:

```bash
python3 skills/task-manager/scripts/task_flow.py create_tasks --input payload.json
```

The same pattern applies to:

- `list_tasks`
- `append_task_comment`
- `complete_task`
- `terminate_task`

## 6. How To Report Success

After `create_tasks`, the Agent should not dump raw JSON unless the user explicitly wants raw data.

Preferred summary style:

> 已为你创建 3 个任务：
>
> 1. 重构登录页交互与校验（程序员 Agent，进行中）
> 2. 补登录接口错误码映射（程序员 Agent，进行中）
> 3. 补登录模块测试用例（程序员 Agent，进行中）
>
> 你可以继续让我跟进其中某一项，或者在任务页里查看进度。

## 7. How To Report Progress

When using `append_task_comment`, the Agent should summarize the meaning of the update, not just say “已追加评论”.

Preferred style:

> 我已经把最新进展同步到任务系统：  
> “已完成表单校验规则整理，正在处理错误提示样式。”

## 8. How To Report Completion

When using `complete_task`, the Agent should say both:

- the task is marked completed
- what result was delivered

## 9. Safety Rules

The Agent should not:

- create tasks silently without user awareness in the default path
- create tasks with no assignee
- create vague titles
- duplicate tasks that are already in progress
- terminate tasks just because work is blocked temporarily

## 10. First-Stage Recommendation

The cleanest first-stage behavior is:

1. suggest task breakdown
2. ask for confirmation
3. create tasks
4. append comments during progress
5. complete or terminate only when clearly justified
