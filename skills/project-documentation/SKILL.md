---
name: project-documentation
description: >
  Create, restructure, or maintain durable project documentation from the
  active repository's authoritative sources. Use for module behavior, product
  scope, contracts, architecture, ADRs, security, migrations, implementation
  status, or acceptance documentation. Do not use to implement application code.
---

# Project Documentation

Produce documentation that another person or coding agent can follow without
the conversation that created it. Derive project facts from the active request,
instruction chain, repository, and named external sources; this skill supplies
process, not project decisions.

## Mandatory entry

Before writing:

1. Read the active project's instruction files and the documents named by them.
2. Inventory the existing documentation, implementation, tests, and runnable
   checks relevant to the requested subject.
3. State the deliverable boundary and the discovered authority order. Never
   invent a source hierarchy, approval, path convention, or architecture.
4. Read [references/workflow.md](references/workflow.md) completely.
5. Read only the matching sections of
   [references/templates.md](references/templates.md).

If authoritative sources conflict at the same priority, stop promotion of the
conflicting claim and record one consolidated decision gap. Continue writing
uncontested facts when that still produces a useful artifact.

## Status contract

Keep these labels independent and attach a source to every use:

- `required`: behavior or constraint mandated by an authoritative source;
- `accepted`: a decision explicitly approved by its owner;
- `proposed`: an option that has not been approved;
- `hypothesis`: an unproven explanation or expectation awaiting evidence;
- `current`: behavior observed in the present implementation;
- `verified`: evidence produced by a dated command or scenario.

One label never implies another. Current code is not automatically required.
Passing verification does not accept a proposal. A proposal or hypothesis must
never be promoted to `required` or `accepted`, or worded as an implementation
instruction.

## Output contract

- Preserve provenance with repository-relative links, stable claim IDs, and
  dates where evidence can age.
- Separate normative behavior, decisions, observed state, and evidence instead
  of blending them in narrative prose.
- Preserve an ID when meaning is unchanged. Supersede rather than silently
  rewrite incompatible meaning.
- Keep sensitive source data out of derived documentation and examples.
- End every created or changed Markdown artifact with exactly one runnable line:

  `самостоятельный чек: <точная команда> + ожидаемый вывод: <наблюдаемый результат>`

Do not claim completion until the command was run when the environment permits.
Report the exact unavailable dependency when it does not.

## Handoff

Documentation may authorize code only when the relevant behavior is `required`,
the chosen design decisions are `accepted`, conflicts are resolved, and
acceptance is observable. Code work then belongs to the
`docs-driven-implementation` skill, invoked through the active harness; this
skill does not implement it.
