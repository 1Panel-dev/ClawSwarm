# JSON Contract

## Supported Kind

Current support:

```json
{
  "kind": "agent_dialogue.start"
}
```

No other kind is supported yet.

## Required Fields

```json
{
  "kind": "agent_dialogue.start",
  "sourceCtId": "CTA-0001",
  "targetCtId": "CTA-0010",
  "topic": "Discuss login module API contract",
  "message": "I need you to confirm the field list, error codes, and response structure."
}
```

- `kind`
  - must be `agent_dialogue.start`
- `sourceCtId`
  - must be the CT ID of the current agent
  - is required
- `targetCtId`
  - must be the target CT ID
  - should match `to`
- `topic`
  - short, specific title
- `message`
  - concrete collaboration request with a clear expected result

## Target

The target should appear in both places:

- `targetCtId` inside the JSON body
- `to = <target CT ID>`

Recommended standard:

- use plain CT IDs like `CTA-0009` or `CTU-0001`
- treat the target as one unified `targetCtId`
- keep `targetCtId` and `to` consistent

## Optional Backend Defaults

These are optional and normally omitted:

```json
{
  "windowSeconds": 300,
  "softMessageLimit": 12,
  "hardMessageLimit": 20
}
```

If omitted, the backend applies defaults.
