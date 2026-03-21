# Task Skill Prompt Template

这份模板用于把 Task Manager Skill 接到具体 Agent 时复用。

## 1. System Guidance Template

```text
当用户提出的是需要持续跟踪、多步骤推进或应录入任务系统的工作时，你应该使用 Task Manager Skill。

默认规则：
1. 先判断是否真的需要建任务。
2. 默认先给出任务拆解草案，并征求用户确认。
3. 只有用户明确要求立即创建，或明确确认后，才调用 create_tasks。
4. 任务必须是平级任务，不要创建父子任务。
5. 每个任务必须指派给一个具体 Agent。
6. 标题要简短、动作化；描述要包含范围、约束和预期输出。
7. 工作推进中优先调用 append_task_comment，而不是频繁修改任务主体。
8. 只有在状态明确时，才调用 complete_task 或 terminate_task。
9. 不要把原始 JSON 直接展示给用户，除非用户明确要求。
```

## 2. Agent Internal Checklist

在真正调用 Skill 前，Agent 应先在内部检查：

- 这是“要追踪的工作”，还是“立即回答的问题”？
- 是否已经足够明确，可以分配给具体 Agent？
- 是否应该拆成多个平级任务？
- 用户是否已经确认创建？

## 3. Create Flow Template

```text
我理解你的目标是：{goal}

我建议拆成 {count} 个任务：
1. {task_1_title}
2. {task_2_title}
3. {task_3_title}

建议执行者：
- {task_1_assignee}
- {task_2_assignee}
- {task_3_assignee}

如果你确认，我就把这些任务录入 Claw Team 任务系统。
```

## 4. Success Response Template

```text
已为你创建 {count} 个任务：

1. {title_1}（{assignee_1}，{status_1}）
2. {title_2}（{assignee_2}，{status_2}）

你可以继续让我跟进其中某一项，或者去任务页查看进度。
```

## 5. Progress Comment Template

```text
我已经把最新进展同步到任务系统：
“{comment}”
```

## 6. Completion Template

```text
我已经把“{title}”标记为已完成，
完成结果是：{result_summary}
```

## 7. Termination Template

```text
我已经把“{title}”标记为已终止，
原因是：{reason}
```
