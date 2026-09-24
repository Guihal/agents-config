# Adaptable documentation templates

Use the active project's headings and paths when they exist. These are minimum
content contracts, not mandatory filenames.

## Shared metadata

```md
# <Document title>

- Purpose: <one sentence>
- Scope: <included subjects>
- Non-goals: <excluded subjects>
- Authority: <ordered repository-relative sources>
- Owner: <decision or maintenance owner>
- Last verified: <date or never>
```

## Behavior or contract

```md
## <AREA-REQ-NNN> — <observable behavior>

- Label: required
- Source: <authoritative anchor>
- Actor and authorization: <who may do what>
- Preconditions: <required state>
- Trigger/input: <validated boundary>
- Result and state change: <observable outcome>
- Failures: <typed/observable outcomes>
- Concurrency/idempotency: <guarantee or not applicable with reason>
- Effects: <external or background effects>
- Acceptance: <positive scenario and negative scenario>
```

## Decision record

```md
## <AREA-ADR-NNN> — <decision question>

- Label: proposed | accepted
- Owner: <approver>
- Source: <request or decision record>
- Context: <forces and constraints>
- Options: <real alternatives>
- Decision: <selected option, empty while proposed>
- Consequences: <benefits, costs, risks>
- Migration/rollback: <path and compatibility>
- Supersedes: <IDs or none>
- Verification: <decision-specific oracle>
```

## Current implementation and evidence

```md
## <AREA-STATE-NNN> — <observed slice>

- Label: current
- Observed at: <revision/date/environment>
- Evidence source: <code/schema/runtime path>
- Matches required IDs: <IDs or none>
- Divergence: <difference without redesigning it>

### Verification record

- Label: verified
- Date/environment: <when and where>
- Command/scenario: <exact input>
- Observed result: <exit, response, state, or artifact>
- Proves: <bounded claim>
- Does not prove: <remaining boundary>
```

## Hypothesis record

```md
## <AREA-HYP-NNN> — <testable explanation>

- Label: hypothesis
- Source: <observation or question that motivated it>
- Prediction: <observable result if true>
- Falsifier: <observable result that rejects it>
- Evidence: <none, or dated command/scenario>
- Status: open | supported | rejected
```

## Migration or deprecation

```md
## <AREA-MIG-NNN> — <change>

- Authorizing IDs: <required and accepted IDs>
- From/to: <states>
- Compatibility window: <consumers and duration>
- Ordered steps: <preflight, change, validation, cleanup>
- Data and rollback: <preservation and reversal>
- Stop conditions: <fail-closed conditions>
- Acceptance: <fresh path, upgrade path, rollback path>
```

## Gaps

```md
## Decision gaps

| ID  | Missing fact or conflict | Known alternatives | Impact | Required owner |
| --- | ------------------------ | ------------------ | ------ | -------------- |
```

Every completed Markdown document ends with:

`самостоятельный чек: <точная команда> + ожидаемый вывод: <наблюдаемый результат>`
