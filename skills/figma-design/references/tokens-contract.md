# Tokens contract — проектные токены: файл в репо + Figma-зеркало

Приоритет правил: где этот файл противоречит harness-lib `design-standard.md` /
`figma-console-workflow.md`, управляют файлы figma-design.

Токены живут в двух носителях с одним направлением синхронизации:

```text
repo DTCG JSON  ──(зеркалирование при Tokens pass)──▶  Figma variables + styles
     ▲                                                        │
     └────────────── паритет проверяется на гейтах ◀──────────┘
```

- **Repo-файл — источник истины.** Figma-набор — развёрнутое зеркало.
- Расхождение зеркала с репо — finding (`off-token-value`/паритет), а не
  «локальная эволюция»: изменения значений идут через правку repo-файла и
  ре-зеркалирование, не через ручную правку переменных в Figma.
- Дефолты этого контракта (шкала 4/8, 1440/390) — стартовые, НЕ догма: проектный
  token-файл и SPEC переопределяют значения под проект (requirements §4).

## 1. Repo-файл (DTCG JSON)

- Формат — DTCG (`$value` / `$type` / `$extensions`).
- Путь выбирает SPEC под проект (например `<repo>/design/tokens/tokens.json`,
  `src/styles/tokens/…` — по конвенции репо). Путь фиксируется в SPEC и в
  MANIFEST (`tokens.repoPath`).
- Два уровня с явными алиасами primitive → semantic:
  - **primitive** — сырые значения (`prim/gray-900 = #0a0a0a`, `prim/space-2 = 8`);
  - **semantic** — роли, ссылающиеся на примитивы алиасом (`"{prim/gray-900}"`):
    surface/content/border/action/status, типографика, spacing, radii, размеры
    контейнеров.
- Значения, различающиеся по разрешению, кодируются в `$extensions`:

```json
{
  "size": {
    "container": {
      "$type": "dimension",
      "$value": "1440px",
      "$extensions": { "modes": { "Desktop": "1440px", "Mobile": "390px" } }
    }
  }
}
```

Скалярный `$value` без `$extensions.modes` = одно значение на оба режима
(в Figma значение одинаково в Desktop и Mobile).

- **Шкала отступов** — обязательная секция `space`: дефолт 4/8
  (0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80 — базовый шаг 4,
  крупные шаги предпочтительно по 8). Проектный token-файл задаёт свой
  конечный набор — тогда гейт `spacing-walk` сверяется с ним, а не с дефолтом.
- **Ширины контейнеров и прочие метрики ширин** — значения modes тех же
  переменных: дефолт Desktop 1440 / Mobile 390. Высоты фреймов (900/844) —
  дефолты viewport-контракта (SPEC может переопределить), это не токены зеркала,
  а контракт MANIFEST.

Пример структуры (сокращённо):

```json
{
  "prim": {
    "gray-900": { "$type": "color", "$value": "#0a0a0a" },
    "white":    { "$type": "color", "$value": "#ffffff" },
    "space-2":  { "$type": "dimension", "$value": "8px" },
    "radius-md":   { "$type": "dimension", "$value": "12px" },
    "size-body":   { "$type": "dimension", "$value": "16px" },
    "font-body":   { "$type": "fontFamily", "$value": "Inter" },
    "container-desktop": { "$type": "dimension", "$value": "1440px" },
    "container-mobile":  { "$type": "dimension", "$value": "390px" }
  },
  "color": {
    "bg/surface":     { "$type": "color", "$value": "{prim/gray-900}" },
    "text/primary":   { "$type": "color", "$value": "{prim/white}" }
  },
  "space": {
    "2": { "$type": "dimension", "$value": "{prim/space-2}" }
  },
  "typography": {
    "font/body": { "$type": "fontFamily", "$value": "{prim/font-body}" },
    "size/body": { "$type": "dimension", "$value": "{prim/size-body}" }
  },
  "radius": { "md": { "$type": "dimension", "$value": "{prim/radius-md}" } },
  "size":   { "container": { "$type": "dimension", "$value": "{prim/container-desktop}",
      "$extensions": { "modes": { "Desktop": "{prim/container-desktop}",
                                  "Mobile": "{prim/container-mobile}" } } } }
}
```

Семантические группы (`color`, `space`, `typography`, `radius`, `size`)
ссылаются только на примитивы через `{prim/…}`; сырые литералы живут
исключительно в группе `prim` — иначе паритет-гейт (§5) неоднозначен.

(Существующие конвенции именования проекта/файла сильнее этой схемы: повторять
их, а не вводить параллельную. Группы выше — минимальный состав, а не
обязательная таксономия.)

## 2. Figma-зеркало: variables

- **Одна коллекция** на проект (имя из конвенции файла, дефолт `Tokens`),
  **два режима: `Desktop` и `Mobile`**. Имена режимов фиксируются дословно —
  на них ссылаются SPEC, гейты и роли.
- Примитивы и семантика живут в одной коллекции; семантическая переменная
  алиасится на примитив (`boundVariables` alias), режимы примитивов —
  одинаковые значения в Desktop/Mobile.
- Значения, зависящие от разрешения (ширины контейнеров, колонки, локальные
  метрики), задаются по режимам той же переменной — один кит кормит оба
  разрешения; отдельной «мобильной» коллекции не создавать.
- Scopes у переменных выставляются по смыслу (например, color-семантика —
  `FRAME_FILL/TEXT_FILL/STROKE_COLOR`, spacing — `GAP/PADDING/CORNER_RADIUS`):
  scope ограничивает ошибочный биндинг в редакторе и документирует намерение.
- Обязательные биндинги (значение из переменной, не сырой литерал):
  `fontSize`, `lineHeight`, `fontFamily`, `paddingLeft/Right/Top/Bottom`,
  `itemSpacing` (gap), `minWidth`/`maxWidth`, `visible` (скрытие состояний —
  через BOOLEAN-переменную, где состояние переиспользуется).
- Переменные создаются/правятся только в Tokens pass (design-worker, Figma).
  Порядок задаёт repo-сторона (раздел 4), два режима:
  - repo-файл есть — зеркало repo → Figma; файл — единственный источник;
  - bootstrap без repo-файла — worker строит переменные по дефолтам
    контракта/SPEC в этом же проходе, а предложенный DTCG-контент фиксирует
    в отчёте прохода (отчёт — временный источник до сохранения); MAIN
    сохраняет файл в репо до следующего прохода, дальше источник — только
    repo-файл; паритет сверяется гейтами (§5).

## 3. Figma-зеркало: styles на переменных

- **Text styles** — типографические роли (`text/display`, `text/heading`,
  `text/body`, `text/caption`, `text/label` или конвенция проекта):
  fontSize/lineHeight/fontFamily внутри стиля забиндены на переменные.
- **Paint styles** — семантические цвета (`bg/surface`, `text/primary`,
  `border/default`, `action/primary`, `status/…`): fill стиля алиасится на
  color-переменную.
- **Effect styles** — тени/блюры на effect-переменных, где повторяются.
- **Grid styles** — сетки колонок (layout grid) как styles; число колонок/
  gutter — значения по режимам (переменные или зафиксированные в SPEC).
- Стили — расходный слой над переменными: правило «значение из токена»
  выполняется и через переменную напрямую, и через стиль на переменной.
  Стиль без биндинга к переменной (сырой hex внутри стиля) — не токен.

## 4. Границы записи (сохранены из скелета, без исключений)

- `design-worker` **не пишет в репозиторий.** Когда repo-файла нет или его
  нужно расширить, worker предлагает полный DTCG-контент (JSON-блок) в своём
  отчёте; **MAIN сохраняет файл в репо** и передаёт фактический путь в SPEC и
  MANIFEST до следующего worker-прохода.
- Мутации в Figma (коллекция, modes, variables, alias, styles, биндинги) —
  только `design-worker`, только в Tokens pass.
- Рецензенты ничего не пишут никуда; паритет они только проверяют.

## 5. Паритет repo ↔ Figma (гейт)

На гейтах (worker self-check, critic, verifier) сравнивается:

1. состав переменных: каждое семантическое имя repo-файла существует в
   коллекции (и наоборот — в Figma нет «лишних» переменных мимо репо);
2. значения по режимам: `$value`/`$extensions.modes` в репо = значения
   Desktop/Mobile соответствующей переменной;
3. алиасы: semantic-переменная в Figma алиасится на тот же примитив, что в
   репо (`{prim/…}`), а не на копию значения;
4. styles: текстовые/paint/effect/grid стили существуют и их внутренние
   свойства забиндены на переменные;
5. биндинги в экранах: `fontSize/lineHeight/fontFamily/padding/gap/min-max/`
   цвета типографики и поверхностей ссылаются на переменные/стили (это же
   покрывает `off-token-walk` из `geometry-gates.md`).

Улика паритета — имена/ID переменных и стилей + значения по режимам с обеих
сторон (repo-путь и collection/variable ID из MANIFEST), никогда «выглядит
согласованно». Расхождение = finding; у raw-значения, совпавшего с токеном
числом, но без биндинга, паритета НЕТ (`off-token-value`).
