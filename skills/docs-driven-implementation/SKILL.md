---
name: docs-driven-implementation
description: >
  Implement or change code from an active project's authoritative, accepted
  documentation while preserving requirement-to-code-to-test evidence. Use for
  code work whose behavior or architecture is already documented. Do not use to
  invent requirements, approve proposals, or merely write documentation.
---

# Documentation-driven implementation

Deliver the documented behavior in the active project's native architecture and
toolchain. This skill defines authorization and traceability, not a language,
framework, directory layout, or design pattern.

## Mandatory entry

1. Read the effective project instructions and every source they identify for
   the requested behavior.
2. Read [references/traceability.md](references/traceability.md) completely.
3. Build the implementation packet before editing: authorizing IDs and anchors,
   acceptance checks, affected enforcement points, callers, existing reusable
   code, data/API compatibility, risks, and excluded behavior.
4. Apply the authorization gate below.

## Authorization gate

Implementation requires all of the following:

- each behavior or constraint is labeled `required` by an authoritative source;
- each design choice needed to implement it is explicitly `accepted` by its
  owner or is already fixed by the required contract;
- referenced claims do not conflict at equal authority;
- acceptance is observable and permissions cover the intended changes.

`proposed`, `hypothesis`, `current`, and `verified` never authorize
implementation by themselves and must not be promoted to `required` or
`accepted`. If a requirement or decision is missing, do not guess or edit code.
Return `STOP: missing-authority` with the exact missing ID/decision,
alternatives already present, impact, and owner needed to continue.

## Implementation contract

- Inspect definitions, callers, tests, schemas, and configuration before edits.
- Preserve the project's dependency direction and ownership model; do not impose
  a generic architecture or create speculative abstractions.
- Keep one source for each rule and runtime contract. Reuse semantic invariants,
  not merely similar-looking code.
- For every implemented authorizing `required` or `accepted` ID, add one concise
  project-native comment at the actual enforcement point:
  `Spec: <ID> (<relative-document-path>#<stable-anchor>)`.
- Do not repeat the comment in transport/callers that merely delegate the rule.
- Name or annotate tests with the same IDs and record real verification evidence.
- Update implementation-status documentation only after observing the result.

Follow the active project's change, risk, and destructive-action rules. A task
request does not authorize production, secret, schema, destructive, or external
mutations beyond those rules.

## Verification and review

Before reporting completion, reject the result if authority, traceability,
project ownership, a required negative case, or the affected real
entry-to-result scenario is missing. Run focused project-native checks and the
real scenario; build success alone is insufficient. Use the active harness's
independent critic when it exists.

Any Markdown plan, migration note, status update, or evidence record created or
changed during implementation must end with:

`самостоятельный чек: <точная команда> + ожидаемый вывод: <наблюдаемый результат>`
