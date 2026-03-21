# Task Decomposition Guidelines

This file defines how an Agent should turn a user request into clean task records.

## Core Rule

Each task should represent one clear outcome with one concrete assignee.

## Good Task Titles

Prefer:

- 动作 + 对象

Examples:

- 重构登录页交互与校验
- 排查统计报表同步延迟
- 整理官网首页文案结构

Avoid vague titles like:

- 登录页
- 看一下
- 优化一下

## Task Descriptions

Descriptions should include:

1. context
2. goal
3. scope
4. constraints

Example:

> 需要整理登录页输入反馈、提交态和错误提示，确保桌面端和移动端表现一致。重点关注手机号输入校验、接口报错展示和按钮 loading 状态。

## Assignee Selection

Every task must be assigned to one concrete Agent.

Preferred order:

1. user-specified Agent
2. best-fit Agent by task type
3. ask for clarification if uncertain

Example mapping:

- coding -> 程序员 / 工程类 Agent
- writing -> 作家 / 内容类 Agent
- analysis -> 数据分析 / 运维类 Agent
- design -> 设计类 Agent

## Priority Guidance

- `low`: minor improvement, no urgency
- `medium`: default
- `high`: important to the current workflow
- `urgent`: blocking or strongly time-sensitive

If unclear, default to `medium`.

## Tags

Use 0-3 tags only.

Prefer:

- module tags
- work-type tags
- scenario tags

Examples:

- 前端
- 登录
- 报表
- 排障

## Duplicate Avoidance

Before creating tasks, check whether a similar task already exists.

Compare:

- title similarity
- goal similarity
- assignee similarity
- whether an existing task is still `in_progress`

If a task already exists, prefer:

- appending a comment
- or telling the user an existing task already covers it

## First-Stage Scope

Use flat tasks only.

Do not create parent/child tasks in the first stage.
