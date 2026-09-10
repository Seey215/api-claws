# Smartwatch Companion Pattern

Use this pattern when an existing device app should gain a personal Agent without implying that
API Claws talks to the hardware directly.

## Story

The existing app syncs a workout from a smartwatch. Its backend writes the user's goal, approved
activity, and feedback to the user's Agent Drive. The Agent keeps an ongoing Session for
conversation and runs a scheduled weekly review to adapt the next plan.

## Resource mapping

| Product concept          | API Claws resource              |
| ------------------------ | ------------------------------- |
| Developer account        | One shared Space                |
| App user                 | One Agent                       |
| User memory and activity | That Agent's Drive              |
| Conversation             | Session below that Agent        |
| Weekly plan adaptation   | Scheduled task below that Agent |

The application owns authentication and the durable `userId -> agentId` mapping. Do not use a
Session as the user identity. Multiple Sessions may belong to the same user's Agent.

## Boundary to state clearly

```text
watch <-> app: existing product integration
app server -> API Claws: Agent integration
```

API Claws receives data from the application. It does not claim to pair, read, or control the
watch directly.

The complete runnable implementation is in
[`examples/smartwatch-companion`](../../../examples/smartwatch-companion).
