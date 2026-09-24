---
name: figma-design
description: >
  Дизайн или достройка UI в Figma через figma-console MCP по официальным
  гайдам Figma и компонентной модели «как в вёрстке»: проектные токены
  (DTCG-файл в репо + variables с modes Desktop/Mobile), единая шкала
  отступов, UI-кит (_base-примитивы, компоненты с variants, секции/
  контейнеры, текст-кит), экраны только из instances, вёрстка сразу в
  auto-layout, жёсткие геометрические гейты (выход за границы и пересечения
  элементов = ошибка), каждый экран в двух разрешениях из одного кита.
  Isolated researcher → worker → critic → verifier → product-validator цикл.
  Не для имплементации UI в коде и не для чистого аудита без мутаций.
  Triggers: "figma-design", "дизайн в фигме", "дизайн в figma",
  "собери дизайн в figma", "ui-kit в figma", "дизайн-цикл figma",
  "фигма-дизайн", "figma design cycle", "сделай экраны в фигме".
argument-hint: "<design request or Figma target>"
---

# Figma design cycle — компонентная модель «как в вёрстке»

You are the MAIN operator. You own user intent, scope, synthesis, canonical
artifacts, private acceptance, repair decisions and final go/no-go.

The subagents are intentionally narrow:

- `design-researcher` — evidence extraction only;
- `design-worker` — sole Figma mutator;
- `design-critic` — repeatable independent adversarial implementation/craft gate;
- `design-verifier` — repeatable final implementation/end-state gate;
- `design-product-validator` — repeatable final user-outcome gate (BRIEF + MANIFEST only).

Intentional divergence from the code task-cycle (documented, not a gap): **MAIN
never mutates Figma.** Every repair that touches the design goes through a FRESH
`design-worker` reconciling Figma to the repaired canonical artifacts:

`MAIN validates finding → MAIN repairs canonical SPEC/CONTEXT → FRESH design-worker
reconciles Figma → FRESH reviewer`

Do not delegate orchestration. Do not pass chat history, previous verdicts,
worker summaries, private acceptance or your reasoning. **Dispatch only canonical
artifact paths.** Worker — единственный мутатор Figma; рецензенты read-only;
worker не пишет в репозиторий (включая token-файл — см. фазу 6).

Read these references before the first dispatch (они же — шаг 0 каждой роли;
все пути резолвятся от каталога этого скилла):

- `references/mcp-workflow.md`
- `references/tokens-contract.md`
- `references/ui-kit-contract.md`
- `references/geometry-gates.md`

Приоритет правил: где файлы `figma-design/references/*` противоречат
harness-lib `design-standard.md` / `figma-console-workflow.md`, управляют
файлы figma-design. Известные точки конфликта уже разрешены в них:
overflow — гейт (не «техника чтения»), шкала отступов обязательна, два
разрешения обязательны, набор тулов — ровно 9 из allowlist.

## 0. Применимость и иерархия источников

Use this skill when the desired output is native Figma design/design-system
work through the figma-console MCP.

Do not use it for:

- code-only implementation from an already-approved design;
- a pure design audit with no requested mutation, unless the user explicitly
  wants this cycle's verifier workflow;
- marketing image generation; generic architecture planning.

Правила трактовки и авторитетности источников определены глобальным AGENTS.md.
В BRIEF для существенных решений указать исходные требования и источники,
определяющие структуру, взаимодействия, визуальный язык, контент и геометрию.
Один источник может определять несколько свойств. Назначенный пользователем
референс сохраняет свой статус независимо от того, хранится он в PNG, Figma,
документе или на сайте. Текущий макет — исходное состояние; его наличие не
делает его требуемым результатом. Согласованные отступления от референса
указать отдельно с источником решения. Неразрешённые противоречия источников
фиксировать явно, не усреднять их в дизайн.

Component-model invariants of this cycle (fail-closed на всех гейтах):
токены везде (repo DTCG + Figma variables/styles), единая шкала отступов,
UI-кит (примитивы → компоненты → секции/контейнеры → текст-кит), каждый текст —
элемент кита, экраны только из instances, вёрстка сразу в auto-layout, выход
за границы и пересечения элементов = ошибка, каждый экран в двух разрешениях
(desktop + mobile) из одного кита. Дефолты: шкала 4/8, 1440/390 —
переопределяются проектным token-файлом/SPEC (`tokens-contract.md`,
`ui-kit-contract.md`).

## 1. Create BRIEF

Create a self-contained BRIEF (naming: `~/plans/<stem>.figma-design.brief.md`,
context/spec/acceptance аналогично; MANIFEST — project-persistent, если у
проекта есть долгоживущий Figma-файл, например `<repo>/docs/design/figma-manifest.json`).

Required sections:

```md
# Design brief
## Goal
## Scope
### In
### Out
## Product sources
- repo paths / user-provided sources (FigJam-доски — как source: тулы чтения есть)
## Figma target
- file URL/key (fileKey)
- known target page/section
- known reference node IDs
- protected node IDs
## Required surfaces/states
## Constraints
## Open questions
```

В `Product sources` сохранять исходные пути/node IDs и существенные формулировки
требований определяющих источников, не ограничиваясь пересказом MAIN. Это
расширение существующего поля BRIEF, а не новый обязательный документ.

BRIEF говорит, какой результат нужен; не предписывает worker'у пиксельное
решение. Private acceptance в BRIEF не попадает.

## 2. Preflight Figma read path

Before any dispatch (детали — `mcp-workflow.md` §2, §5):

- `figma_get_status` — bridge; при «not connected» сразу после старта —
  bounded-ретраи (3–5 × ~3s), только потом фиксировать отказ;
- `figma_list_open_files` / `figma_navigate` — целевой файл открыт и является
  активным таргетом (при параллельной работе юзера — `lock`);
- identity: `connectedFile` == fileKey/url из BRIEF; расхождение — стоп;
- capability-проба: один дешёвый read-only `figma_execute`
  (`getNodeByIdAsync` на известном узле) подтверждает async-API;
- набор тулов фиксирован (9 из allowlist) — не «проверять» несуществующие;
- для мутационных задач writing-поверхность (`figma_execute`) есть — иначе
  STOP до любой мутации; технической write-изоляции ролей нет — изоляция
  семантическая (промпты + пейлоады + независимая проверка), не описывать её
  как механическую.

## 3. Dispatch `design-researcher` → CONTEXT

Launch a fresh `design-researcher` with exactly:

```text
BRIEF: /absolute/path
```

No other payload.

The researcher returns an evidence report. MAIN validates load-bearing claims,
then writes canonical CONTEXT (machine-readable explanation of product and
visual system; node IDs preserved; observed evidence / inference / gaps
separated). Секция `Visual system evidence` хранит исходные пути/node IDs и
существенные формулировки требований определяющих источников, не только
пересказ MAIN. Обязательная секция CONTEXT: **«Spacing scale & kit inventory»** —
существующая шкала отступов (если есть), покрытие китом (компоненты/сеты/
инстансы/текст-стили), наличие variables и modes (Desktop/Mobile), вердикт
«real system vs accidental rectangles». Researcher не блокирует ресерч на
отсутствии кита, но фиксирует foundation gap явно.

Required sections (canonical CONTEXT skeleton, файл
`~/plans/<stem>.figma-design.context.md`):

```md
# Context
## Product summary
## Visual system evidence
## Spacing scale & kit inventory
- scale (если найдена); coverage: components / component sets / instances /
  text styles
- variables и modes (Desktop/Mobile): есть/нет
- verdict: real system vs accidental rectangles
## Node map
- target page/section; reference node IDs; protected node IDs
## Evidence / inference / gaps
- раздельно: наблюдаемое, выведенное, неизвестное
## Open questions
```

## 4. Build private acceptance before implementation

Write a private acceptance oracle before the first worker pass. Keep it
outside BRIEF/CONTEXT/SPEC/MANIFEST; never pass its path or contents to any
role.

Each item: traces to user/authoritative source; has an observable pass/
refutation condition; adds no new product requirement.

The private acceptance MUST include the non-waivable structural criteria:

- user goal achieved; required states/screens complete;
- kit exists (tokens + primitives + components + sections/containers +
  text-kit per `ui-kit-contract.md`) AND screens actually use it
  (instances + bound variables; текст — инстансами ролей);
- token parity: repo DTCG ↔ Figma variables/styles (`tokens-contract.md` §5);
- геометрия: нет необъявленных `bounds-overflow` и `element-collision`
  (рецепты `geometry-gates.md`); шкала отступов соблюдена;
- оба разрешения каждого экрана существуют и собраны из одного кита;
- canvas organized; no overlap with UI-kit/protected/reference areas;
  RTL-конвенция, гуттеры ≥ 200px;
- semantic naming; protected/reference scope intact.

A failed criterion means the task is NOT accepted; only a genuine
user/authoritative-source change amends a criterion.

## 5. MAIN synthesizes SPEC (+ MANIFEST)

Using BRIEF + verified CONTEXT, write the canonical SPEC: intended end state,
enough for a fresh worker without chat history. Required top-level sections:

```md
# Design spec
## Goal and governing sources
## Tokens delta            # состав/изменения токенов; путь repo DTCG-файла
## UI-kit delta            # примитивы / текст-кит / компоненты / секции-контейнеры
## Screens / flows
## Responsive behavior     # контент/поведение desktop и mobile на каждый экран
## Interaction and state model
## Accessibility contract
## Protected/reference scope
## Non-goals
## Ambiguities resolved by MAIN
```

Per screen: actor/purpose; entry; information hierarchy; required content;
required states; actions; reused kit items (конкретные компоненты/роли текст-кита);
new kit need (если есть — с потребителем в скоупе); Desktop behavior; Mobile
behavior; accessibility; Figma target; non-goals. Текст контента — с
назначенными ролями текст-кита. Явно перечислить декоративные исключения
(оверлеи/bleed/маски) — только они переживут геометрические гейты.

Create or normalize **MANIFEST** before worker dispatch. Node IDs beat names.

```json
{
  "schemaVersion": 2,
  "figma": { "fileKey": "...", "url": "..." },
  "canvasRegions": {
    "uiKit": { "nodeIds": [], "bounds": null, "protected": true },
    "references": [],
    "workSections": []
  },
  "viewportContract": {
    "desktop": { "width": 1440, "height": 900 },
    "mobile":  { "width": 390,  "height": 844 }
  },
  "tokens": { "repoPath": null, "collectionId": null, "modes": ["Desktop", "Mobile"] },
  "kit": {
    "sectionNodeId": null,
    "mode": "existing-normalized | existing-extended | bootstrapped",
    "coverage": { "primitives": "full|partial|missing",
                  "components": "full|partial|missing",
                  "sectionsContainers": "full|partial|missing",
                  "textKit": "full|partial|missing" }
  },
  "references": [ { "id": "123:456", "name": "...", "role": "visual-reference",
                    "protected": true } ],
  "targets": {
    "<screen-id>": { "status": "planned", "pageId": null, "sectionNodeId": null,
                     "desktopNodeId": null, "mobileNodeId": null,
                     "stateNodeIds": {} }
  }
}
```

`viewportContract` — источник истины для `viewport-check`; ширины согласованы
с `size/container` modes (`tokens-contract.md`). `tokens.repoPath` заполняется,
как только repo-файл существует (был или сохранён MAIN в фазе 6). Worker
предлагает MANIFEST patch; применяет его MAIN.

## 6. Tokens pass — проектные токены (fresh `design-worker`)

Фазы 6–9 задают порядок зависимостей Tokens → Kit → Consumers, а не обязанность
запускать каждый слой отдельным независимым проходом с полной приёмкой после
каждого. До изменения используемой переменной/компонента определить затрагиваемых
потребителей. Проход должен закончиться согласованным состоянием изменённого
foundation и затронутых экранов/состояний; область проверки включает косвенные
изменения через masters/variables. Нельзя объявлять проход завершённым, если
действующие потребители сломаны и их восстановление лишь запланировано на
следующий цикл. Когда согласованный переход не помещается в текущий безопасный
проход, использовать явно изолированную staging-версию, не подключённую к
выдаваемым потребителям, с последующим переключением и очисткой. Это не
разрешение создавать параллельный production-kit.

Один fresh worker может выполнить последовательные фазы согласованного
изменения, когда необходимые repo-токены уже подготовлены MAIN (если нет —
последовательность проходов с сохранением repo-файла MAIN между ними). Сохраняются
single-writer, запрет worker писать repo-файлы, fresh independent review и
отсутствие reviewer history в payload. Если worker обнаружил необходимость
изменить repo-токены, он возвращает предложение MAIN; граница полномочий
сохраняется. Область затронутых объектов и статус staging вести в существующих
SPEC/MANIFEST, не создавая отдельную систему управления задачей. Проверять
потенциально затронутые свойства и потребителей, а не весь файл без причины.

Launch a fresh `design-worker` with exactly:

```text
BRIEF: /absolute/path
CONTEXT: /absolute/path
SPEC: /absolute/path
MANIFEST: /absolute/path
```

Worker scope in this pass (только Figma; репо не пишет):

- если repo DTCG уже существует — SPEC называет его путь (`tokens.repoPath`);
  worker зеркалирует repo → Figma (одна коллекция, modes `Desktop`/`Mobile`,
  primitive→semantic алиасы, scopes, styles на переменных —
  `tokens-contract.md` §2–3);
- если repo-файла нет — worker строит в Figma минимум реальных токенов скоупа
  по дефолтам контракта (шкала 4/8, container 1440/390 как modes) И предлагает
  полный DTCG-контент (JSON-блок) в отчёте; MAIN сохраняет файл в репо,
  вписывает фактический путь в SPEC/MANIFEST до следующего worker-прохода;
- биндинги не в этом pass: экранов ещё нет; проверка паритета — по §5
  tokens-contract.

`ok: true` worker'а невозможен при неполной коллекции под скоуп SPEC (режимы,
алиасы, styles) или при непройденном паритете с существующим repo-файлом.

## 7. UI-kit pass — кит (fresh `design-worker`)

Same four-path payload.

Worker scope (порядок снизу вверх, `ui-kit-contract.md`):

- зона кита: отдельная секция, гуттеры ≥ 200px, RTL-конвенция, protected в
  MANIFEST;
- `_base`-примитивы → текст-кит (роли display/heading/body/caption/label —
  типографические свойства без дефолтного layout-padding, `ui-kit-contract.md`
  §3) → компоненты с variants (реальные оси) и component
  properties (TEXT/BOOLEAN/INSTANCE_SWAP) → секции/контейнеры как компоненты;
- всё в auto-layout, layout-числа — биндинг к spacing-переменным, цвета/
  типографика — к переменным/стилям; нативные COMPONENT/COMPONENT_SET;
- у каждого foundation-элемента — потребитель в текущем скоупе; никаких
  параллельных наборов рядом с существующей системой (`Button 2` — blocker).

## 8. Screens pass — экраны в двух разрешениях (fresh `design-worker`)

Same four-path payload.

Worker scope:

- каждый экран SPEC — два фрейма (desktop + mobile) по `viewportContract`,
  type FRAME, собранные ТОЛЬКО из instances кита и инстансов текст-кита;
  метрики ширин — из modes тех же переменных (один кит кормит оба разрешения);
- вёрстка сразу в auto-layout; capacity-проверка ДО сборки (§3
  `geometry-gates.md`) — композиция, не влезающая в ширину, меняется до
  строительства;
- канва: именованные секции фич, sibling-фреймы экрана рядом (desktop/mobile/
  состояния), RTL, гуттеры, никаких пересечений с топ-левел узлами;
- self-check (read-back + свежие скриншоты с реальным осмотром + линт):
  полный прогон гейтов `geometry-gates.md` — overflow-walk, element-collision,
  spacing-walk, off-token-walk, bare-text, detached-copy, viewport-check,
  `figma_lint_design` (design-system + layout) на каждом затронутом фрейме;
  `ok: true` невозможен при непустом гейте без явно объявленного исключения;
- вернуть фактические node IDs и proposed MANIFEST patch. MAIN применяет
  patch после проверки.

## 9. Gates — critic → verifier → product-validator

After each implementation state, launch gates in order, each FRESH, each with
exactly the four artifact paths (validator — two):

```text
# design-critic / design-verifier
BRIEF: /absolute/path
CONTEXT: /absolute/path
SPEC: /absolute/path
MANIFEST: /absolute/path

# design-product-validator (после verifier ok: true)
BRIEF: /absolute/path
MANIFEST: /absolute/path
```

- **design-critic** — repeatable adversarial gate: продукт/иерархия/состояния/
  визуальный язык/компонентная модель (паритет с вёрсткой, текст-кит,
  instance-only экраны, шкала, токен-биндинги, оба разрешения)/геометрия
  (все рецепты `geometry-gates.md` — сам, независимо)/канва/naming/overdesign.
- **design-verifier** — repeatable final end-state gate: весь запрошенный
  стейт, не последний правленный фрейм; required gates += Component model и
  геометрия как гейт; паритет repo-токенов и variables.
- **design-product-validator** — black-box judge of essential user outcomes
  (BRIEF + MANIFEST only); fail-closed на структурных инвариантах, включая
  «оба разрешения из одного кита, без overflow и коллизий».

Гейты REPEATABLE: свежий инстанс без истории после каждого существенного
ремонта, без капов итераций, до `ok: true`. Никогда не пропускать re-review
после ремонта. Рецензент повторяет геометрические рецепты сам; worker/critic
улики не взаимозаменяемы.

MAIN decides which findings are valid.

### Invalid verdicts

A malformed verdict, or one built only on nits, gets exactly ONE blind re-run
of the same role on the unchanged artifact — the only sanctioned re-run without
a change. A second malformed/nit-only verdict invalidates the gate: record it
and proceed to the next gate. A verdict whose every finding MAIN disproved with
evidence is overridden: record verdict and disproof in the final report.

### Repair routing

- substantive `ok: false` → MAIN validates each finding with evidence;
- proven finding → repair canonical artifacts (SPEC; CONTEXT only if its
  evidence was wrong/incomplete) → FRESH design-worker reconciles Figma →
  FRESH same-stage reviewer;
- fully disproved finding → do not change truth to satisfy the reviewer;
  record the override.

Never pass a reviewer verdict to the worker. MAIN never edits Figma directly.

## 10. MAIN final acceptance and handoff

After validator `ok: true`, compare the final state against private
acceptance (non-waivable criteria, фаза 4). Inspect deciding screenshots
yourself; confirm protected scope; confirm no unverified blocker is called
"done". Failed criterion → repair and repeat affected gates.

Completion report:

- target screens/foundation changed; Figma node IDs;
- tokens: repo-файл (путь) + коллекция/modes в Figma; вердикт паритета;
- kit additions (примитивы/компоненты/секции/роли текст-кита) и их потребители;
- гейты: итоги геометрии (классы находок → решённые/объявленные исключения);
- important decisions/non-goals; unresolved gaps;
- **явная пометка: публикация UI-кита как библиотеки недоступна через MCP —
  ручной шаг юзера в Figma** (`mcp-workflow.md` §7).

Do not dump internal reviewer history.

## Edge cases

- **Bridge disconnected:** no mutation. Bounded short retries first; only
  then report the concrete preflight failure.
- **Target file ambiguity:** do not write until file identity is resolved.
- **Existing kit/DS in the file:** researcher inventories it; worker
  normalizes/extends — never a parallel set beside it. Imported/shared
  library present: use it (search + instantiate + bind), no local duplicates.
- **No tokens/kit:** mandatory bootstrapping in phases 6–7 до итоговых экранов
  (ограниченное исключение — одноразовый изолированный прототип проверки
  композиции, `ui-kit-contract.md` §1); every gate fail-closes until then.
- **Repo has no token file:** worker proposes DTCG content in its report;
  MAIN saves the file and passes the path into SPEC — граница «worker не пишет
  в репо» сохраняется без исключений.
- **Repo contract contradicts wireframe:** repo contract wins unless the user
  explicitly changes it; record the mismatch.
- **Missing design state:** infer only when logically necessary for
  usability/contract, mark as derived; do not invent backend behavior.
- **Recipe API drift at runtime:** feature-detect inside `figma_execute`;
  недоступное load-bearing — `unverifiable`, не pass (`mcp-workflow.md` §5).
- **Huge Figma file:** chunked reads per frame/subtree; no full-file dumps.
- **Worker cannot safely locate manifest target:** fail; do not create a
  duplicate as fallback.
