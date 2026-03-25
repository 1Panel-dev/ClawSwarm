# Task Decomposition Guidelines

This file defines how an Agent should turn a user request into clean task records.

## Core Rule

Each task should represent one clear outcome with one concrete assignee.

In the first stage, that assignee is always the current Agent itself.

## Good Task Titles

Prefer:

- action + object

Examples:

- Refactor login page interaction and validation
- Investigate dashboard sync latency
- Reorganize homepage copy structure

Avoid vague titles like:

- Login page
- Take a look
- Optimize it

## Task Descriptions

Descriptions should include:

1. context
2. goal
3. scope
4. constraints

Example:

> Improve login-page input feedback, submit states, and error messaging so desktop and mobile behavior stay consistent. Focus on phone-number validation, API error presentation, and button loading states.

## Assignee Selection

Every task must be assigned to one concrete Agent.

First-stage rule:

1. use the current Agent handling the conversation
2. do not auto-assign to another Agent
3. if another Agent would be a better fit, mention that in chat rather than silently reassigning

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

- frontend
- login
- reporting
- debugging

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

If the conflict is strong enough that an old task may need deletion:

- do not delete it silently
- surface the conflict to the owner
- ask for explicit deletion confirmation

## Task Hierarchy

Use one of these two shapes only:

1. one standalone task
2. one parent task with child tasks

Do not create a third level.

Every child task must already be small enough to execute directly.
