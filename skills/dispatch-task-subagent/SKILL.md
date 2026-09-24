---
name: dispatch-task-subagent
description: Delegate a PR-sized implementation to the configured Codex task subagent while preserving `task` planning, verification, and parent-side review. Use only when the user explicitly asks for a task subagent, delegated PR, parallel implementation wave, or equivalent agent execution.
---

# Dispatch Task Subagent

1. Validate the task, repository, allowed write paths, acceptance checks, dirty state, and dependencies.
2. Create a decision packet with goal, context, constraints, tried work, blocker if any, and observable success.
3. Spawn one Codex collaboration agent with custom role `task`. Give it the complete packet and require it to run its own current `task` workflow.
4. Use one writer per file. Parallelize only independent scopes explicitly authorized by the user.
5. Wait for completion; inspect the real diff and run the narrow acceptance checks yourself.
6. If the task agent's inner review was unavailable or incomplete, run a parent-side `critic` gate before accepting the result.
7. Reuse the named agent for corrections. Do not spawn identical replacements after repeated failure; change strategy.

The parent owns final go/no-go, destructive decisions, credentials, and the user-facing report.
