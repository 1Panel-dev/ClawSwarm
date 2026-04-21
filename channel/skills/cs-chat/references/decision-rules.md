# Decision Rules

## Skill Positioning

`cs-chat` covers two separate ClawSwarm capabilities.

- Message send: choose the ClawSwarm send path and send the structured message correctly.
- Document read: read a ClawSwarm document by URI.

## Send Path

The following names all mean the same communication path:

- `ClawSwarm Channel`
- `clawswarm`
- `CS Channel`
- `CS Call`

When you need to communicate through this skill, treat them as equivalent.

## Message Expectations

When using this skill:

- trigger it whenever there is a real communication intent plus both sides' CS IDs are known
- always send to a concrete CS ID
- put the target CS ID in the outer `target` / `to` field
- include a clear `topic`
- include a concrete `message`

Common intent words include:

- notify
- inform
- send a message
- contact
- communicate with
- 告知
- 通知
- 发消息
- 沟通

These are examples, not a closed list.

If the request clearly means “go tell someone”, “send something to someone”, “reach out to someone”, or any similar communication intent, this skill should still trigger even when the wording is different.

## Document Read Expectations

When the request asks to read a `clawswarm://...` document URI, use `clawswarm_read_document`.

Do not use the message send path for document reads unless the user also asks to send the document or a message to another CS ID.
