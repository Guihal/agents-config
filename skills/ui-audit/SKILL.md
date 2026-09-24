---
name: ui-audit
description: >
  UI-валидация живой страницы через playwright MCP: WCAG 2.1 AA (axe-core)
  + overflow / position / overlap / touch-targets sniffer + structured JSON-репорт.
  Triggers: «проверь вёрстку», «ui-audit», «валидация страницы»,
  «проверь overflow», «проверь accessibility», «audit page»,
  «touch-target audit», «overflow check», «mobile-баги», «DOM inspection без injection».
argument-hint: "<url> [--mobile] [--no-axe]"
---

# ui-audit — UI валидация страницы

Локальная проверка живой страницы на layout-баги и a11y-issues. Использует
**playwright MCP** (browser engine) + **axe-core** (WCAG 2.1 AA) + собственный
sniffer для overflow / position / overlap / touch-targets.

Не зависит от `browse` skill (его symlink сейчас битый — намеренно без него).

## Когда запускать

- После правки SCSS/HTML/PHP-шаблона — поймать regression на overflow / position.
- Перед merge / перед сдачей блока редактору — проверить accessibility.
- На этапе «вёрстка вслепую» — увидеть, что видит пользователь.

## Workflow (8 шагов)

Шаг 1. Resize viewport (аргументы/переменные шага; дефолт 1920×1080 — не исчерпывающее
покрытие, дополнительные ширины — см. шаг 7):
```
playwright_browser_resize({width: <W>, height: <H>})   // default: 1920×1080
```

Шаг 2. Navigate:
```
playwright_browser_navigate({url: "<URL>"})
```

Шаг 3. Axe-core WCAG 2.1 AA — `playwright_browser_evaluate` со стрелкой
из `references/axe-snippet.js`. Возвращает JSON-массив violations:
`{id, impact, count, elements[], help, helpUrl}`.

Шаг 4. Layout-sniffer — `playwright_browser_evaluate` со стрелкой
из `references/sniffer.js`. Выдача — кандидаты для проверки, не готовые вердикты:
- `scroll_overflow[]` — переполнение прокручиваемого контейнера (`scroll > client` без clip), с осью и размерами
- `clip_candidates[]` — срезанный контент, включая `overflow:hidden/clip`: декор/crop легитимны, проверь последствия для смыслового контента
- `position_outside_viewport[]` — `fixed/absolute` с частичным (`exit` — величина выхода в px по сторонам) или полным (`fullyOutside`) выходом за viewport; viewport- и document-координаты разведены (`docTop/docLeft`)
- `position_below_fold[]` — absolute ниже первого экрана — норма сама по себе, только контекст для осмотра
- `layout_collisions[]` + `collisions_total` — пересечения > 5×5 px БЕЗ ancestor↔descendant containment; записи `{a, b, intersection:{w,h}, relationship: siblings|cross-branch}`, список ограничен 25; cross-branch пересечения контролов — кандидаты для проверки hit-testing/взаимодействием
- `touch_targets_small[]` — эвристика размера (< 44 px по измерению), НЕ WCAG-вердикт

Шаг 5. Console errors: `playwright_browser_console_messages({})`.

Шаг 6. Screenshot desktop (обзорный): `playwright_browser_take_screenshot`
с `fullPage: true, filename: "/tmp/ui-audit-<slug>-desktop.png"`. Обзор не заменяет
осмотр: перед визуальным заключением сними и просмотри viewport/section/component-
снимки в читаемом масштабе — путь к PNG сам по себе не является осмотром.

Шаг 7. Дополнительные viewport-проходы — дефолт mobile 375×667; это дефолты, а не
исчерпывающее покрытие: промежуточные ширины выводи из реальной responsive-логики
страницы (media-queries/breakpoints в CSS). Повторить шаги 1-6.

Шаг 8. Свести в JSON-репорт по шаблону:
```json
{
  "url": "<URL>",
  "desktop": { "axe": {...}, "sniffer": {...}, "console_errors": [] },
  "mobile":  { "axe": {...}, "sniffer": {...}, "console_errors": [] },
  "screenshot_desktop": "/tmp/ui-audit-<slug>-desktop.png",
  "screenshot_mobile":  "/tmp/ui-audit-<slug>-mobile.png"
}
```

## Готовые inline-скрипты

Ниже — тела функций, которые нужно передать в `playwright_browser_evaluate`
как `function`-аргумент (строкой). Это убирает зависимость от того, что файлы
доступны на хосте.

### Axe-core WCAG 2.1 AA

```js
async () => {
  if (!window.axe) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const r = await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] });
  return JSON.stringify(r.violations.map(v => ({
    id: v.id, impact: v.impact, count: v.nodes.length,
    elements: v.nodes.slice(0,3).map(n => n.target.join(' ')),
    help: v.help, helpUrl: v.helpUrl
  })), null, 2);
}
```

### Layout sniffer

```js
() => {
  const out = {
    scroll_overflow: [],
    clip_candidates: [],
    position_outside_viewport: [],
    position_below_fold: [],
    layout_collisions: [],
    collisions_total: 0,
    touch_targets_small: [],
    touch_targets_note: 'heuristic size candidates, not a WCAG verdict; verify in context'
  };
  const vw = window.innerWidth, vh = window.innerHeight;
  const all = Array.from(document.querySelectorAll('*'));
  const desc = (el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 80) });
  const items = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cs = getComputedStyle(el);
    const d = desc(el);
    const overX = el.scrollWidth > el.clientWidth + 1, overY = el.scrollHeight > el.clientHeight + 1;
    const clipX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    const clipY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    const clippedX = overX && clipX, clippedY = overY && clipY;
    if (clippedX || clippedY) {
      out.clip_candidates.push({
        ...d,
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
        hiddenBy: [clippedX ? 'x' : null, clippedY ? 'y' : null].filter(Boolean).join('+'),
        note: 'clipped content candidate; decor/crop can be legitimate, verify consequences for meaningful content'
      });
    }
    if (overX && !clipX || overY && !clipY) {
      out.scroll_overflow.push({
        ...d,
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
        axis: [overX && !clipX ? 'x' : null, overY && !clipY ? 'y' : null].filter(Boolean).join('+'),
        note: 'scrollable overflow; check that content stays reachable'
      });
    }
    if (cs.position === 'fixed' || cs.position === 'absolute') {
      const exit = {
        left: Math.round(Math.max(0, -r.left)),
        top: Math.round(Math.max(0, -r.top)),
        right: Math.round(Math.max(0, r.right - vw)),
        bottom: Math.round(Math.max(0, r.bottom - vh))
      };
      const docTop = Math.round(r.top + window.scrollY), docLeft = Math.round(r.left + window.scrollX);
      const fullyOutside = r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh;
      if (cs.position === 'fixed') {
        if (exit.left > 0 || exit.top > 0 || exit.right > 0 || exit.bottom > 0) {
          out.position_outside_viewport.push({
            ...d, pos: 'fixed', coords: 'viewport', exit, fullyOutside,
            note: 'fixed element out of the viewport is unreachable; candidate'
          });
        }
      } else if (r.top >= vh) {
        out.position_below_fold.push({
          ...d, pos: 'absolute', coords: 'document', docTop, docLeft, exit,
          note: 'below-fold absolute is normal by itself; inspect as content, not an automatic defect'
        });
      } else if (exit.left > 0 || exit.top > 0 || exit.right > 0) {
        out.position_outside_viewport.push({
          ...d, pos: 'absolute', coords: 'viewport', exit, fullyOutside, docTop, docLeft,
          note: 'candidate; verify reachability of content/actions'
        });
      } else if (exit.bottom > 0) {
        out.position_below_fold.push({
          ...d, pos: 'absolute', coords: 'document', docTop, docLeft, exit,
          note: 'spans below the first screen; inspect as content, not an automatic defect'
        });
      }
    }
    if (el.matches('a, button, input, select, textarea, [role=button], [role=link]') && (r.width < 44 || r.height < 44)) {
      out.touch_targets_small.push({ ...d, w: Math.round(r.width), h: Math.round(r.height), text: (el.innerText || '').trim().slice(0, 30) });
    }
    items.push({ el, r, d });
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      const a = A.r, b = B.r;
      if (a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom) continue;
      const ix = Math.round(Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const iy = Math.round(Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (ix <= 5 || iy <= 5) continue;
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue; // ancestor<->descendant containment is not a collision
      const siblings = !!A.el.parentElement && A.el.parentElement === B.el.parentElement;
      out.layout_collisions.push({
        a: A.d, b: B.d,
        intersection: { w: ix, h: iy },
        relationship: siblings ? 'siblings' : 'cross-branch',
        note: siblings ? 'candidate; verify visually and by hit-testing' : 'cross-branch overlap; verify hit-testing/interaction, not an automatic defect'
      });
    }
  }
  out.collisions_total = out.layout_collisions.length;
  out.layout_collisions = out.layout_collisions.slice(0, 25);
  return JSON.stringify({ vw, vh, docWidth: document.documentElement.scrollWidth, scrollY: window.scrollY, ...out }, null, 2);
}
```

## Пример вызова

```text
/skill:ui-audit http://localhost:8090/factories/elie-saab-maison/
```

После этого агент последовательно дёргает 6 MCP-tools на каждый viewport,
собирает JSON, выводит короткий summary:

```
URL: http://localhost:8090/factories/elie-saab-maison/
Desktop (1920×1080): axe=0 violations, sniffer={scroll_overflow:0, clip_candidates:0, position:0, collisions_total:0, touch:2}
Mobile  (375×667):   axe=1 violation [color-contrast], sniffer={scroll_overflow:0, clip_candidates:0, position:0, collisions_total:1, touch:5}
Screenshots: /tmp/ui-audit-single-elie-{desktop,mobile}.png
```

## Границы применения

**Ловит (кандидаты для проверки, не готовые вердикты):**
- Scroll-overflow по `scrollWidth/scrollHeight > client` (ось + размеры)
- Clip-кандидаты: срезанный контент, включая `overflow:hidden/clip` — декор/crop легитимны, проверь последствия для смыслового контента
- Position: частичный выход (с величиной по сторонам) и полный (`fullyOutside`); viewport vs document координаты; below-fold absolute — не дефект сам по себе
- Layout-пересечения > 5×5 px без containment: конкретные пары с размерами пересечения и `relationship: siblings|cross-branch`; cross-branch — кандидат для проверки hit-testing/взаимодействием
- Touch-targets < 44×44 — эвристические кандидаты размера; НЕ автоматическое WCAG-нарушение
- WCAG 2.1 AA (axe-core): color-contrast, alt-text, ARIA, heading-order, label, link-name — axe-часть остаётся WCAG-scoped; автоматический скан не доказывает полную accessibility

**Не ловит (out of scope):**
- Pixel-diff (используй `lost-pixel` или swatchdog)
- Off-token color/radius/spacing (используй swatchdog-mcp)
- CLS / perf (используй Lighthouse)
- Cross-browser rendering (нужен отдельный run)

## Files

```
~/.agents/skills/ui-audit/
├── SKILL.md               # этот файл
└── references/
    ├── sniffer.js         # file-relative копия sniffer-функции
    └── axe-snippet.js     # file-relative копия axe-функции
```

## Role-safe variant (для Reviewer / Escalation Advisor)

Граница этих ролей по [`system-constitution §Toolkits`](~/.agents/skills/system-constitution/SKILL.md)
— про ремонт артефактов, а не про запрет безопасного взаимодействия с тестируемым
продуктом: не ремонтировать источники/конфиги/историю, без DOM-инъекции (axe
script-inject). Это не универсальный закон «никогда не click/fill»: финальная
black-box приёмка тестового продукта ролью без read-only ограничения (например
product-validator) использует обычное безопасное взаимодействие. Принудительные
клики в обход перекрытия/недостижимости запрещены во всех режимах.

`--no-axe` режим — **только sniffer** (без axe-core script-inject, без DOM-модификации):

1. Resize viewport: `playwright_browser_resize({width: 1920, height: 1080})` — дефолт; другие ширины — по шагу 7
2. Navigate: `playwright_browser_navigate({url: "<URL>"})`
3. Sniffer: `playwright_browser_evaluate` со стрелкой из `references/sniffer.js`
4. Screenshot: `playwright_browser_take_screenshot` (уже входит в MCP-toolset,
   не модифицирует DOM страницы); осмотр в читаемом масштабе — как в шаге 6
5. Mobile pass: повторить шаги 1-4 с `width: 375, height: 667`.

**Полный ui-audit (axe + sniffer + screenshot) — только для Teamlead /
Auditor / Operator** (full MCP use per §Toolkits).
