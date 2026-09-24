---
name: lost-pixel
description: >
  Visual regression gate via tools/lost-pixel/ — browser-based screenshot
  diff against PNG baseline. Triggers: «visual regression», «screenshot
  diff», «pixel diff», «lost-pixel», «layout regression», «task-done
  visual gate», «page-overlap check», «baseline PNG check».
argument-hint: "[--regress-tmp|--capture-exec|--promote-exec]"
---

# Lost-pixel — visual regression wrapper (constitutional-roles edition)

Инструмент `tools/lost-pixel/` сравнивает PNG-скриншоты с baseline.
Подробности про ролевые границы (write/read ceiling per role) см.
[`system-constitution §Role rights`](~/.agents/skills/system-constitution/SKILL.md#role-rights)
и [`system-constitution §Toolkits note`](~/.agents/skills/system-constitution/SKILL.md) —
НЕ дублируется здесь.

## Конституционное правило

По §Role rights ни одна из 5 ролей не пишет в `tools/lost-pixel/`
напрямую (Operator — `docs/**`/root `*.md`; остальные — nothing).
Поэтому **§2 capture и §3 promote ВСЕГДА через executor subagent**
(`worker` с closed `allowed_write_paths`). §1 (regress) пишет
diff-артефакт в `tools/lost-pixel/lost-pixel-diff/` — это тоже
мутация working tree, поэтому даже §1 direct запрещён всем ролям.
Единственная direct-команда — **§1-tmp** (копирует baseline в /tmp
и запускает regress там, артефакты в /tmp, не в проекте).

## Команды

### §1-tmp Read-only regress (direct, для всех 5 ролей)

```bash
TD=$(mktemp -d)
cp -r /home/penis/projects/eleishkina/tools/lost-pixel "$TD/"
cd "$TD/lost-pixel" && ./node_modules/.bin/lost-pixel
# diff-артефакты в $TD/lost-pixel/lost-pixel-diff/, не в проекте
rm -rf "$TD"
```

- exit 0 = все 10 PNG равны baseline.
- С env `LOST_PIXEL_FAIL_ON_DIFFERENCE=1 ./node_modules/.bin/lost-pixel`
  → exit 1 на diff + артефакт `./lost-pixel-diff/<name>.png` (в $TD).
- ⚠ `npm run regress:strict` теряет exit code (npm wrapper). Используй
  прямой вызов `./node_modules/.bin/lost-pixel`.

### §1 direct — ЗАПРЕЩЕНО для всех ролей

Даже при §1 working tree мутируется (`lost-pixel-diff/*.png`). По
§Role rights "Can write: nothing" для Reviewer/Teamlead/Auditor/Advisor
и "только docs/root" для Operator — **все роли идут через §1-tmp**.

### §2 capture — ВСЕГДА через executor

Пишет 10 PNG в `tools/lost-pixel/lost-pixel/`. Executor dispatch:

```yaml
subagent({
  agent: "worker",
  task: |
    cd /home/penis/projects/eleishkina/tools/lost-pixel
    npx tsx scripts/capture.ts
  allowed_write_paths:
    - /home/penis/projects/eleishkina/tools/lost-pixel/lost-pixel/
  cwd: /home/penis/projects/eleishkina
})
```

Worker имеет `bash` + `write` в tools, поэтому выполнит `npx tsx
scripts/capture.ts`. Parent (любая роль) только диспатчит — не
выполняет сама.

### §3 promote — ВСЕГДА через executor

Пишет в `tools/lost-pixel/lost-pixel-baseline/`. Executor dispatch:

```yaml
subagent({
  agent: "worker",
  task: |
    cd /home/penis/projects/eleishkina/tools/lost-pixel
    bash scripts/promote-baseline.sh
  allowed_write_paths:
    - /home/penis/projects/eleishkina/tools/lost-pixel/lost-pixel-baseline/
  cwd: /home/penis/projects/eleishkina
})
```

§3 — destructive для прежнего baseline. Operator или Teamlead
диспатчит с явной justification ("diff accepted, baseline refresh").

## Role matrix (binding)

| Роль | §1-tmp direct | §1 direct | §2 capture | §3 promote |
|---|---|---|---|---|
| Operator (main)        | ✓ | ✗ | (via executor) | (via executor) |
| Reviewer               | ✓ | ✗ | (via executor) | (via executor) |
| Teamlead               | ✓ | ✗ | (via executor) | (via executor) |
| Auditor                | ✓ | ✗ | (via executor) | (via executor) |
| Escalation Advisor     | ✓ | ✗ | (via executor) | (via executor) |

Universal: §1-tmp direct — единственная direct-команда для ВСЕХ 5 ролей;
всё остальное — через executor с closed `allowed_write_paths`.

## Side-effects note

§1-tmp НЕ мутирует working tree (копия + regress в /tmp). Дифф-артефакты
в $TD/lost-pixel/lost-pixel-diff/ — verification output, удаляется
с `rm -rf $TD` после run.

§1 direct (ЗАПРЕЩЕНО) — мутировал бы `tools/lost-pixel/lost-pixel-diff/`,
поэтому запрещён per role-aware reading of §Role rights.

§2 / §3 мутируют `tools/lost-pixel/lost-pixel/` и `tools/lost-pixel/
lost-pixel-baseline/` соответственно — вне `docs/**` и root `*.md`,
поэтому ВСЕГДА через executor.

## Готовый inline-script (для inline subagent run)

```bash
TD=$(mktemp -d)
cp -r /home/penis/projects/eleishkina/tools/lost-pixel "$TD/"
cd "$TD/lost-pixel"
./node_modules/.bin/lost-pixel
RC=$?
rm -rf "$TD"
echo "exit=$RC"
```
