# Implementation traceability

## Build the packet

Create this working map before code changes:

| Authorizing ID | Source anchor | Status | Enforcement point | Test | Evidence |
| -------------- | ------------- | ------ | ----------------- | ---- | -------- |

Include every `required` behavior/constraint and every compatible `accepted`
decision that affects the implementation. An empty status, source, enforcement
point, or acceptance column is a stop condition, not a TODO.

## Locate the enforcement point

The enforcement point is the smallest place that owns the invariant or effect.
Find it by tracing the real entrypoint through calls and state changes. A parser,
handler, adapter, database constraint, policy, or worker may be the owner only
when the active project assigns that responsibility there.

Before adding anything, search for the ID, the domain term, existing helpers,
schemas, errors, repositories, and tests. Resolve all callers. Do not implement
the same transition or validation in multiple layers.

## Link documentation, code, and tests

Use the project's native comment syntax with this semantic content:

```text
Spec: <ID> (<repository-relative-document-path>#<stable-anchor>)
```

Place one link at each actual enforcement point for every authorizing ID. When
one point enforces several IDs, list them together. When one ID has genuinely
separate enforcement points, document each in the working map.

Use the same ID in test names or native test annotations. Each ID needs:

- a positive case proving its observable result;
- a negative case for prohibitions, authorization, validation, concurrency,
  idempotency, rollback, or failure-preservation guarantees it contains;
- an entry-to-result scenario through the real boundary;
- evidence naming exact command/input, observed result, environment, and limit.

## Change handling

- Documentation wording changed, semantics same: retain the ID and update links.
- Semantics changed incompatibly: stop until a new authorizing ID supersedes the
  old one; do not silently repurpose comments or tests.
- Code differs from required behavior: implement the authorized behavior and
  preserve compatibility rules, or stop at the project's risk gate.
- Current code exposes an undocumented behavior: do not canonize it from code;
  send it to documentation as `current` plus a decision gap.
- A hypothesis suggests a change: test or document it, but do not implement it
  until an authoritative source independently marks behavior `required` and
  the necessary decision `accepted`.
- Test contradicts authority: determine whether implementation or test is stale;
  never weaken the oracle merely to get green output.

## Evidence record

Record verification only after execution:

| ID  | Command/scenario | Observed result | Environment | Does not prove |
| --- | ---------------- | --------------- | ----------- | -------------- |

Never label a claim verified from a planned command, a mocked substitute for the
requested boundary, or a success token that omits the user-visible result.
