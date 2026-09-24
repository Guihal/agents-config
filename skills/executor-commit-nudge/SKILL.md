---
name: executor-commit-nudge
description: Stop a delegated executor from polishing indefinitely after acceptance is already met. Use when an implementation agent has passing checks and written files but keeps refining, has produced no completion signal, or needs a bounded finish reminder.
---

# Executor Commit Nudge

Send this to the existing named executor; do not restart it:

> Stop expanding scope. Re-read the acceptance checks, run the cheapest final verifier, inspect the diff for accidental changes, and finish now. Do not add improvements unrelated to acceptance. Report changed files, checks, failures, and remaining risks. Commit only if the delegation explicitly authorized a commit.

Before nudging, verify that files or commits actually changed. If no progress exists, diagnose the blocker instead. If work exists after an agent is lost, inspect and validate it before considering a replacement.
