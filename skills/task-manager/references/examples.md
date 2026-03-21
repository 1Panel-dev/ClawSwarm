# Task Skill Examples

这份文档给出 Task Manager Skill 的标准示例，方便后续接入任何 Agent。

## 1. 创建任务前的确认示例

用户输入：

```text
帮我把登录模块整理一下，后面我要继续开发。
```

Agent 建议回复：

```text
我理解你的目标是把登录模块整理成可继续推进的工作项。

我建议先拆成 3 个平级任务：

1. 重构登录页交互与表单校验
2. 补登录接口错误码映射和错误提示
3. 补登录模块测试用例

建议执行者：
- 任务 1：程序员 Agent
- 任务 2：程序员 Agent
- 任务 3：测试 Agent（如果当前没有测试 Agent，就先给程序员 Agent）

如果你确认，我就把这些任务录入 Claw Team 任务系统。
```

## 2. create_tasks 输入示例

```json
{
  "tasks": [
    {
      "title": "重构登录页交互与表单校验",
      "description": "整理登录页输入反馈、提交态、错误提示和表单校验逻辑，确保桌面端与移动端交互一致。",
      "priority": "high",
      "tags": ["前端", "登录"],
      "assignee": {
        "instance_id": 1,
        "agent_id": 2
      }
    },
    {
      "title": "补登录接口错误码映射和错误提示",
      "description": "统一登录接口错误码与前端提示文案，避免用户看到不明确的失败信息。",
      "priority": "medium",
      "tags": ["接口", "登录"],
      "assignee": {
        "instance_id": 1,
        "agent_id": 2
      }
    }
  ],
  "reason": "用户确认把登录需求拆成任务并录入系统"
}
```

## 3. create_tasks 命令行示例

```bash
python3 skills/task-manager/scripts/task_api.py create_tasks --input payload.json
```

如果要同时拿到适合直接回复给用户的总结：

```bash
python3 skills/task-manager/scripts/task_flow.py create_tasks --input payload.json
```

成功输出示例：

```json
{
  "created": [
    {
      "task_id": 101,
      "title": "重构登录页交互与表单校验",
      "status": "in_progress",
      "assignee": {
        "instance_id": 1,
        "instance_name": "OpenClaw 主节点",
        "agent_id": 2,
        "agent_name": "程序员 Agent"
      }
    }
  ]
}
```

## 4. 创建成功后的推荐回复

```text
已为你创建 2 个任务：

1. 重构登录页交互与表单校验（程序员 Agent，进行中）
2. 补登录接口错误码映射和错误提示（程序员 Agent，进行中）

你接下来可以让我继续拆测试任务，或者直接跟进其中某一个任务。
```

## 5. append_task_comment 输入示例

```json
{
  "task_id": 101,
  "comment": "已完成登录表单规则梳理，正在处理错误提示样式。",
  "author_type": "agent"
}
```

命令行：

```bash
python3 skills/task-manager/scripts/task_api.py append_task_comment --input payload.json
```

或：

```bash
python3 skills/task-manager/scripts/task_flow.py append_task_comment --input payload.json
```

推荐回复：

```text
我已经把最新进展同步到任务系统：
“已完成登录表单规则梳理，正在处理错误提示样式。”
```

## 6. list_tasks 输入示例

```json
{
  "status": "in_progress",
  "keyword": "登录",
  "limit": 10
}
```

推荐回复：

```text
我查到 2 个和“登录”相关的进行中任务：

1. 重构登录页交互与表单校验
2. 补登录接口错误码映射和错误提示
```

## 7. complete_task 输入示例

```json
{
  "task_id": 101,
  "comment": "登录页交互和校验已完成并验证通过。"
}
```

推荐回复：

```text
我已经把“重构登录页交互与表单校验”标记为已完成，
并同步了完成说明：登录页交互和校验已完成并验证通过。
```

## 8. terminate_task 输入示例

```json
{
  "task_id": 101,
  "comment": "当前需求方向已经变化，这项任务不再继续推进。"
}
```

推荐回复：

```text
我已经把这项任务标记为已终止，
原因是当前需求方向已经变化，这项任务不再继续推进。
```

## 9. 错误处理示例

如果脚本返回错误 JSON：

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "`task_id` is required"
  }
}
```

Agent 不要原样把 JSON 扔给用户，推荐这样转述：

```text
这次还不能执行，因为缺少任务编号。我先帮你确认具体是哪一条任务，再继续处理。
```

## 10. preview_create 示例

```bash
python3 skills/task-manager/scripts/task_flow.py preview_create --input payload.json
```

输出会同时包含：
- `preview`
- `user_message`

其中 `user_message` 可以直接作为确认前的候选回复。
