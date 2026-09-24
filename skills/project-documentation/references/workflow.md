# Documentation authoring workflow

Follow the sequence. Do not skip a step because the repository already contains
plausible prose.

## 1. Define the request

Write down the requested audience, subject, deliverable, editable boundary, and
explicit non-goals. Split multiple document purposes before drafting.

## 2. Discover local rules

Walk from global instructions to repository root and then toward the working
directory. Record the effective instruction files, conflicts, required tools,
and required checks. Locate the project's documentation index if one exists.

## 3. Inventory evidence

Search before creating a parallel source. Inspect relevant signed specifications,
existing documents, schemas, source code, tests, migrations, configuration, and
generated artifacts. Treat source code as evidence of `current`, never proof of
`required` or `accepted`.

## 4. Build a claim ledger

Before prose, make a working table with:

| ID  | Claim | Label | Authority/source | Evidence | Conflict |
| --- | ----- | ----- | ---------------- | -------- | -------- |

Use the project's ID convention. If none exists, use a deterministic local
grammar `<AREA>-<KIND>-<NNN>`, document that editorial convention, and avoid
renumbering existing IDs.

## 5. Resolve authority

Apply only the authority order found in the active instruction chain or direct
request. A newer source does not win merely because it is newer. When equal
authority conflicts, mark both claims and create one decision gap containing
the exact alternatives, consequences, and owner required to resolve it.

## 6. Select one document purpose

Choose the smallest matching type: scope/source index, module behavior,
roles/access, runtime contract, data ownership, system/runtime architecture,
external integration, security/threat model, background work, observability and
testing, ADR, migration/deprecation, or implementation status/evidence. Follow
the project's layout; do not impose these names as directories.

## 7. Draft from claims

Use the matching template. Put normative statements under `required`, decisions
under `accepted` or `proposed`, unproven explanations under `hypothesis`,
repository observations under `current`, and executed proof under `verified`.
Link instead of copying a claim owned elsewhere.

## 8. Specify boundaries

For every behavior, identify actor, preconditions, trigger/input, normal result,
state change, authorization, failure outcomes, concurrency/idempotency concerns,
and externally visible effects. Mark absent information as a gap; do not fill it
with a convenient design.

## 9. Preserve lifecycle

- Same meaning: edit wording and retain the ID.
- Compatible extension: retain the ID and record the added scope.
- Incompatible meaning: create a new ID and mark the prior claim superseded with
  a forward link and reason.
- Rejected proposal: retain its decision record and rejection reason.
- Disproved hypothesis: retain its source and the evidence that rejected it;
  never rewrite it as though it had been accepted or required.
- `current`/`verified`: append dated evidence; do not rewrite history to look
  continuously correct.

## 10. Reconcile the set

Check callers and neighboring documents for duplicated rules, contradictory
statuses, broken anchors, stale links, orphan IDs, and stronger wording than the
source supports. Update the index when the project owns one.

## 11. Define acceptance

For each normative claim, provide an observable positive check. For every
prohibition, authorization boundary, concurrency rule, or failure guarantee,
provide a negative check. A build alone is not an end-to-end behavior check.

## 12. Run and record evidence

Run the cheapest relevant checks and the affected real scenario. Record command,
date, environment boundary, exit/result, and what the check does not prove.
Finish each Markdown artifact with:

`самостоятельный чек: <точная команда> + ожидаемый вывод: <наблюдаемый результат>`

## Pre-output audit

Reject the draft when any answer is yes:

- Is a proposal worded as accepted or required?
- Is a hypothesis promoted to accepted or required without authority?
- Is current implementation presented as desired behavior without authority?
- Does verified evidence omit the command, date, or observed result?
- Does one claim have two owners or two copied definitions?
- Did an incompatible semantic change reuse an old ID?
- Is a mutable fact hardcoded without provenance?
- Does a prohibition lack a runnable negative check?
- Does the document depend on chat history to be understood?
