---
name: night
description: Run a bounded unattended local development loop while the user is away. Use for /night, overnight, autopilot, auto mode, спать, сплю, ночь, or авторежим requests with clear acceptance criteria.
---

# Night Autopilot

1. Parse optional `prod ok` or `deploy ok`; without it, keep all work local.
2. Read project instructions, package scripts, status, and task/spec. Preserve unknown dirty changes.
3. Convert the goal to acceptance checks and implement small vertical slices.
4. Run the cheapest relevant verifier after each slice. After three failures of one class, change strategy.
5. Stop safely when blocked and leave a decision packet with tried work and recovery state.

Never delete volumes, destructively migrate production, force-push, read secrets, use destructive rsync, make payments, or send bulk messages. Finish with changes, checks, known failures, rollback, and deploy/health state when explicitly authorized.
