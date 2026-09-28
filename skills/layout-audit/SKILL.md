---
name: layout-audit
description: >
  Поблочный структурно-геометрический аудит вёрстки живой страницы через
  web-inspector MCP: делит страницу на смысловые блоки, обходит все ноды
  каждого блока на каждом разрешении (дефолт 375/768/1200 + промежуточные
  ширины из media-queries), ищет перекрытия, клиппинг, overflow, выход за
  viewport, мелкие touch-targets и convention-нарушения (margin-top,
  fix-height canvas, контентный absolute), пишет инкрементальный
  findings-файл со скриншотами. Triggers: «поблочный аудит»,
  «аудит блоков страницы», «проверь блоки на всех разрешениях»,
  «block layout audit», «пройдись по нодам блока», «находки по блокам в файл».
argument-hint: "<url> [<url>…] [--widths <w,w,w>] [--out <dir>]"
---

# layout-audit — поблочный аудит вёрстки живой страницы

Движок — web-inspector MCP (в этой среде тулы `mcp__web-inspector__*`).
Вход — перечень URL. Каждая страница делится на смысловые блоки; каждый
блок прогоняется конвейером «все ноды на разрешении 1 → дозапись находок в
файл → разрешение 2 → дозапись → …», минимум на 3 разрешениях. Находки —
кандидаты для проверки, не готовые вердикты. Аудит осматривает страницу и
не изменяет её: все пробники read-only, ремонт страницы — вне скилла.

## Когда запускать

- нужна поблочная проверка вёрстки живой страницы на нескольких разрешениях;
- после правок секции — поймать перекрытия/клиппинг/дрейф в затронутом
  блоке, а не сниффом всей страницы;
- ступень 2 двухступенчатой UI-приёмки (front/AGENTS.md): DOM и вычисленная
  геометрия после визуального сравнения с бордом.

## Границы — что скилл не делает

- axe-core/WCAG и layout-снифф целой страницы — сосед `ui-audit`
  (playwright MCP);
- pixel-diff против baseline и плотный sweep по ширинам — сосед `lost-pixel`;
- интерактивные GUI-флоу (клики, ввод, сценарии) — сосед `web-gui-tester`;
  аудит не чинит и не меняет проверяемую страницу;
- сверка с Figma-бордом (ступень 1 приёмки) — `figma-design`/Desktop Bridge.

## Вход и разрешения

Аргументы: один или несколько URL, опционально `--widths <w,w,w>` (явный
override набора ширин) и `--out <dir>` (каталог вывода; дефолт
`./layout-audit-<YYYY-MM-DD>/` от cwd; в проекте Myfriend проектная
практика — `docs/audits/…` по указанию оператора).

Дефолтные разрешения: `375×812`, `768×800`, `1200×800`. Высоты не являются
контрактом — следуют за шириной пресета.

На первом проходе страницы извлеки media-queries (скрипт «MQ-ширины» ниже).
Правило добавления ширины: возьми MQ-ширины, не входящие в ±24px ни к одной
уже выбранной ширине и лежащие строго между крайними выбранными; если таких
несколько — добавь одну, ближайшую к середине самого широкого промежутка
между выбранными ширинами. Источник запиши в заголовок findings-файла.
Если доступных стилей нет (cross-origin/CSS-in-JS) — честно зафиксируй в
заголовке «промежуточные ширины не выводились» с причиной; нулевая выдача —
ограничение отчёта, а не индульгенция.

## Конвейер block-outer

Внешний цикл конвейера — блок, внутренний — разрешение (block-outer),
дословно по форме запроса:

```text
для каждой страницы:
  partition (карта блоков) → MQ-ширины → findings-заголовок
  для каждого блока из карты:
    для каждой ширины W по возрастанию:
      navigate(url, W) → ждать готовности → ре-локация блока
      нод-проход + пробник + console + подтверждение кандидатов
      скриншот блока → дозапись подсекции в findings-файл
```

Смена viewport = повторный `navigate` (перезагрузка страницы), поэтому блок
аудируется на 3 перезагрузках — принятая цена запрошенной формы. Не
переконфигурируй цикл «ширина-снаружи»: порядок задан здесь.

После каждого `navigate(url, W)` жди готовности через `wait_for_network_idle`
или `wait_for_element` на селектор блока — не сном. Затем ре-локуй блок
селектором из карты (`query_selector` / `check_visibility`). Политика
отсутствия блока (импровизировать её нельзя):

- селектор не нашёлся → перестрой блочную карту на W тем же шагом partition;
- блок в новой карте есть → селектор дрейфнул (гидрация/ленивые блоки):
  обнови селектор в карте и продолжай аудит блока на W;
- блока в новой карте нет → легитимное отсутствие (desktop-only секция,
  мобильная замена): запиши подсекцию отсутствия (контракт ниже) и продолжай
  со следующего разрешения.

## Шаги аудита

### Шаг 1. Partition — карта блоков

`navigate(url, <первая ширина набора>)` → `inspect_dom` без селектора
(обзор страницы: header/nav/main/section/footer + счётчики интерактива) →
выдели смысловые блоки. Карта блоков: `{id, name, selector}` — по одному на
top-level секцию (или подмножество, явно указанное в запросе). Селекторы
стабильные: семантичный тег + класс (`section.hero`, `footer.site-footer`),
не `nth-child`. Фолбэк при слабой семантике — `find_by_text` по заголовку
блока и предложенный селектор. Карту зафиксируй в заголовке findings-файла.

### Шаг 2. MQ-ширины

`evaluate` скриптом «MQ-ширины» (ниже) на первом проходе страницы; далее —
правило добавления из раздела «Вход и разрешения».

### Шаг 3. Нод-проход блока

`inspect_dom({ selector: <block>, maxDepth: 10, maxChildren: 40 })` — дети с
координатами, дистанциями от краёв родителя (центрирование/гэпы) и флагами
`scrollable ↕️/↔️` с величиной overflow. Это структурная половина прохода по
нодам; геометрическую половину даёт пробник.

### Шаг 4. Пробник блока

`evaluate` скриптом «Блочный пробник» (ниже; `<block-selector>` замени на
селектор блока из карты). Выход — компактный JSON: page-метрики
(`documentElement.scrollWidth` vs `clientWidth`; не сравнивай с `innerWidth` —
он включает скроллбар и пропускает переполнение под ним), `scanned`, `totals` (считаются до
среза), `truncated`-флаги и capped-списки (кап 20 на класс; кап отчёта ≠ кап
детекции). Если `evaluate` вернул preview+token — достань полный вывод через
`confirm_output(token)`. Если блок огромен и пробник не проходит целиком —
прогони его по прямым детям (`<block> > *`) и зафиксируй чанкование в
подсекции: это ограничение покрытия, а не чистый результат.

### Шаг 5. Консоль

`get_console_logs({ type: 'error', since: 'last-navigation' })` один раз на
проход (блок × разрешение); результат — в подсекцию.

### Шаг 6. Подтверждение кандидатов

Подтверждай специализированными тулами, не повторным прогоном пробника:

- `layout_collisions` → `compare_element_alignment` пары + просмотренный
  скриншот; cross-branch пары контролов — дополнительно `check_visibility`
  (перекрытие и кликабельность);
- `clip_candidates` → `measure_element` + `inspect_ancestors` (источник
  клиппинга — `overflow: hidden` какого предка);
- `scroll_overflow` → `inspect_dom` селектором контейнера (scrollable-флаг) +
  `measure_element`;
- `position_outside_viewport` → `get_computed_styles` (position) +
  `measure_element` (величина выхода);
- `touch_targets_small` → `measure_element`;
- `text_overflow_candidates` → `get_computed_styles` (overflow,
  text-overflow, white-space) + просмотренный скриншот мелкого масштаба;
- convention-классы (`margin_top_usage`, `fixed_height_canvas`,
  `content_absolute`) → `get_computed_styles` + источник проектного запрета.

### Шаг 7. Скриншоты

Только нативный screenshot-тул `visual_screenshot_for_humans` — hand-written
base64 запрещён глобально. Тул снимает вьюпорт в текущей позиции прокрутки,
а не кроп элемента (проверено живым прогоном: PNG строго viewport-размера, а
кадры блоков у верха страницы побайтово совпадали); кадрирование блока — это
прокрутка страницы. На каждый (блок × разрешение):

1. после `navigate` прокрутка сброшена в 0; вычисли дельту с учётом верхних
   fixed/sticky-оверлеев (хедер закрывает верх кадра при любом скролле):
   `evaluate` → `{ blockTop: Math.round(document.querySelector('<block-selector>').getBoundingClientRect().top),
   overlayBottom: <низ самого нижнего видимого fixed/sticky-элемента, пересекающего
   верх вьюпорта> }`; видимый оверлей — `position: fixed|sticky`, rect покрывает
   y=0, ненулевая высота, `opacity != 0`, `pointer-events != none`; дельта =
   `max(0, blockTop - overlayBottom)`;
2. примени её через `scroll_by({ selector: 'html', pixels: <delta> })`; не
   доверяй молча `scroll_to_element` — в живом прогоне он отчитывался
   успехом, не сдвигая страницу; проверь после прокрутки `evaluate`-ом
   `scrollY` и окклюзию: `getBoundingClientRect().top` блока ≥ overlayBottom
   с допуском ±1px (субпиксельное квантование скролла ~0.2px не должно
   флагить корректный кадр; живой прогон: сажение блока ровно на границу
   оверлея держало строгую проверку в false); если блок ещё под оверлеем —
   доскролль ВНИЗ на разницу, при овершоте (top > overlayBottom + 2px и
   верх блока уехал выше нужной позиции кадра) — вверх; перепроверь;
3. сними `{ name: "<page>-<block>-<w>", selector: <block>, downloadsDir:
   "<out>/screenshots/" }`; блок выше вьюпорта — несколько кадров с шагом
   ~высоты вьюпорта и суффиксами (`-p2`, `-p3`); при желании один обзор на
   ширину `{ name: "<page>-overview-<w>", fullPage: true }`;
4. если тул вернул preview+token — персистенцируй файл через
   `confirm_output(token)`;
5. проверь, что файл реально появился (`ls`; к имени добавляется
   таймстемп-суффикс); побайтовая идентичность кадров двух разных блоков
   одной ширины (`md5sum`) — признак неудачного кадрирования ТОЛЬКО при
   различающихся проверенных `scrollY` этих блоков (живой прогон: два блока
   у верха страницы легитимно дали одинаковые байты при scrollY=0 у обоих);
   в этом случае ретейк с проверенной прокруткой; идентичность при равном
   verified scrollY — норма, не ретейкить (идентичность повторных кадров
   того же блока — норма); если файл упал в дефолтный
   `./.mcp-web-inspector/screenshots/`, а не в `downloadsDir`, перенеси его
   shell-командой `cp`/`mv` (нативный канал для бинарных файлов).

Каждый снимок, на который ссылается находка, обязан быть просмотрен: захват
без осмотра — не наблюдение; уменьшенный обзорный скрин не доказывает мелкую
читаемость. В этой среде `Read` PNG-файла возвращает CDN-URL без инлайнового
визуала — просматривай кадр доступным image-analysis-тулом по этому URL
(живой прогон: Read отдал ссылку, фактический осмотр — analyze_image).

### Шаг 8. Дозапись подсекции

Сразу после завершения прохода (блок × разрешение) дозапиши подсекцию в
findings-файл по контракту ниже. Файл растёт по ходу конвейера; финального
«сброса одним дампом» нет.

## Скрипты

Единственная копия каждого скрипта живёт здесь; вызывай через `evaluate`,
заменив `<block-selector>` на селектор блока. Оба скрипта read-only.

### MQ-ширины

```js
// evaluate: извлечь ширины из media-условий доступных стилей (em/rem → px по базе 16px)
const widths = new Set(); let inaccessible = 0;
for (const sheet of document.styleSheets) {
  try {
    const walk = (rules) => { for (const r of rules) {
      const m = r.media ? r.media.mediaText : '';
      if (m) { let match; const re = /\((?:min|max)-width:\s*([\d.]+)(px|em|rem)\)/g;
        while ((match = re.exec(m))) widths.add(Math.round(parseFloat(match[1]) * (match[2] === 'px' ? 1 : 16))); }
      if (r.cssRules) walk(r.cssRules);
    } };
    walk(sheet.cssRules);
  } catch (e) { inaccessible++; }
}
return JSON.stringify({ mq_widths: Array.from(widths).sort((a, b) => a - b), sheets_inaccessible: inaccessible });
```

### Блочный пробник

```js
// evaluate: поблочный пробник кандидатов; заменить <block-selector>. Read-only.
const BLOCK = document.querySelector('<block-selector>');
if (!BLOCK) return JSON.stringify({ error: 'block-not-found', selector: '<block-selector>' });
const CAP = 20;
const res = { layout_collisions: [], clip_candidates: [], scroll_overflow: [],
  position_outside_viewport: [], touch_targets_small: [], text_overflow_candidates: [],
  margin_top_usage: [], fixed_height_canvas: [], content_absolute: [] };
const totals = {}; const truncated = {};
for (const k in res) { totals[k] = 0; truncated[k] = false; }
const vw = window.innerWidth, vh = window.innerHeight; const de = document.documentElement;
const push = (k, item) => { totals[k]++; if (res[k].length < CAP) res[k].push(item); else truncated[k] = true; };
const desc = (el) => { const c = el.className && el.className.baseVal !== undefined
  ? el.className.baseVal : el.className; return { tag: el.tagName.toLowerCase(), cls: String(c || '').slice(0, 60) }; };
const hasDirectText = (el) => Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
const WHITELIST = 'img,button,input,select,textarea,svg,video,canvas,picture,iframe';
// фиксированные px-высоты >=200 из доступных author-стилей (кандидаты fixed_height_canvas)
const fixedSels = []; let sheetsInaccessible = 0;
for (const sheet of document.styleSheets) {
  try {
    const walk = (rules) => { for (const r of rules) {
      if (r.style && r.selectorText) { const h = r.style.height;
        if (h && /px$/.test(h) && parseFloat(h) >= 200) fixedSels.push(r.selectorText); }
      if (r.cssRules) walk(r.cssRules);
    } };
    walk(sheet.cssRules);
  } catch (e) { sheetsInaccessible++; }
}
const fixedSet = new Set();
for (const sel of fixedSels) { try { BLOCK.querySelectorAll(sel).forEach(el => fixedSet.add(el)); } catch (e) {} }
const items = [];
for (const el of BLOCK.querySelectorAll('*')) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) continue;
  const cs = getComputedStyle(el);
  const d = desc(el);
  const overX = el.scrollWidth > el.clientWidth + 1, overY = el.scrollHeight > el.clientHeight + 1;
  const clipX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
  const clipY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
  if ((overX && clipX) || (overY && clipY)) push('clip_candidates', { ...d,
    scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
  if ((overX && !clipX) || (overY && !clipY)) push('scroll_overflow', { ...d,
    scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
  if (cs.position === 'fixed' || cs.position === 'absolute') {
    const exit = { left: Math.round(Math.max(0, -r.left)), top: Math.round(Math.max(0, -r.top)),
      right: Math.round(Math.max(0, r.right - vw)), bottom: Math.round(Math.max(0, r.bottom - vh)) };
    // ниже-fold absolute — легитимный декор-паттерн, не флагаем
    if (cs.position === 'fixed' || exit.left > 0 || exit.top > 0 || exit.right > 0)
      push('position_outside_viewport', { ...d, pos: cs.position, exit });
  }
  if (el.matches('a, button, input, select, textarea, [role=button], [role=link]') &&
      (r.width < 44 || r.height < 44))
    push('touch_targets_small', { ...d, w: Math.round(r.width), h: Math.round(r.height) });
  if (hasDirectText(el) && el.scrollWidth > el.clientWidth + 1)
    push('text_overflow_candidates', { ...d, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
  if (parseFloat(cs.marginTop) > 0) push('margin_top_usage', { ...d, marginTop: cs.marginTop });
  if (fixedSet.has(el) && !el.matches(WHITELIST))
    push('fixed_height_canvas', { ...d, height: Math.round(r.height), source: 'stylesheet px height >= 200' });
  if (cs.position === 'absolute' && (hasDirectText(el) ||
      el.querySelector('a, button, input, select, textarea, [role=button]')))
    push('content_absolute', { ...d, directText: hasDirectText(el) });
  items.push({ el, r, d });
}
for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
  const A = items[i], B = items[j], a = A.r, b = B.r;
  if (a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom) continue;
  const ix = Math.round(Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const iy = Math.round(Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  if (ix <= 5 || iy <= 5) continue;
  if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
  push('layout_collisions', { a: A.d, b: B.d, intersection: { w: ix, h: iy },
    relationship: A.el.parentElement === B.el.parentElement ? 'siblings' : 'cross-branch' });
}
return JSON.stringify({ vw, vh, docClientWidth: de.clientWidth, docWidth: de.scrollWidth,
  pageHorizontalOverflow: de.scrollWidth > de.clientWidth,
  scanned: items.length, stylesheetsInaccessible: sheetsInaccessible,
  totals, truncated, capped: res });
```

## Контракт findings-файла

Markdown-файл `findings-<slug>.md` в каталоге вывода, один на страницу;
`slug` — читабельное имя из URL. Заголовок фиксирует URL, дату, набор
разрешений с источником MQ-ширин, карту блоков `{id, name, selector}`.
Дальше — секция `### <block>` на блок, внутри подсекция `#### <width>` на
проход (блок × разрешение): scanned/total по классам пробника, page-метрики,
console-errors, ссылка на просмотренный скриншот и находки. Подсекция
отсутствия блока — coverage-запись, а не пропуск: каждый (блок × разрешение)
имеет свою подсекцию. Дозапись — после каждого прохода.

Буквальный пример:

```markdown
# layout-audit — http://127.0.0.1:3100/

- Дата: 2026-09-28T16:20:00Z
- Разрешения: 375×812, 768×800, 1200×800 (+1024 добавлена из @media (min-width: 1024px); источник: document.styleSheets)
- Карта блоков: header (`header.site-header`), hero (`section.hero`), faq (`section.faq`)
- Каталог вывода: ./layout-audit-2026-09-28/

### header (`header.site-header`)

#### 375

- Пробник: scanned=14; layout_collisions=0, clip_candidates=0, scroll_overflow=0,
  position_outside_viewport=0, touch_targets_small=2, text_overflow_candidates=0,
  margin_top_usage=0, fixed_height_canvas=0, content_absolute=0; truncated=false
- Page: documentElement.scrollWidth=360, clientWidth=360 (равны)
- Console errors: 0
- Скриншот: screenshots/seed-header-375.png (просмотрен)

- LAY-001 · touch_targets_small · status: candidate
  - a.burger: 32×28; подтверждение: measure_element → 32×28 (меньше 44×44)
- LAY-002 · layout_collisions · status: confirmed
  - a: span.badge (38×18), b: a.nav-link (64×22); intersection 11×9; cross-branch
  - подтверждение: compare_element_alignment + скриншот seed-header-375.png

#### 768

- …

#### 1200 — block absent

- status: dismissed — блока нет в блочной карте 1200 (замещён мобильным nav).
  Coverage-запись: проход (block × width) выполнен, находок нет.
```

Находка: `LAY-NNN` (сквозная нумерация на страницу), класс, `status:
candidate|confirmed|dismissed`, селектор(ы), числа (rect/пересечение/выход/
marginTop), подтверждение (какой тул, что показал) и ссылка на просмотренный
скриншот. `confirmed` — только после визуального подтверждения просмотренным
снимком; `dismissed` — всегда с причиной.

## Эпистемика и правило улик

- Каждая находка несёт селектор + числа; никогда «looks ok».
- Каждый чистый результат несёт рецепт + scanned/total по классам.
- Zero-результат не доказывает случаи вне предиката пробника.
- Convention-классы (`margin_top_usage`, `fixed_height_canvas`,
  `content_absolute`) — дефект только при проектном запрете (например,
  front/AGENTS.md «Vertical rhythm — bottom margins only» и «Fluid layout»);
  источник запрета указывается в записи находки; без известного запрета —
  `status: candidate`.
- Числовой кандидат ≠ визуально подтверждённый дефект: статус меняется
  только после осмотра снимка/специализированного тула.

## Разделение тул

| Движок | Скилл | Зона |
| --- | --- | --- |
| web-inspector MCP | layout-audit (этот скилл) | поблочный структурный/геометрический аудит живой страницы: перекрытия, клиппинг, видимость, скролл, нод-проход, ≥3 разрешения |
| playwright MCP | ui-audit | axe-core WCAG 2.1 AA + layout-снифф целой страницы, JSON-репорт |
| playwright/browser-use | web-gui-tester | интерактивные GUI-флоу-тесты (клики/ввод/сценарии) |
| figma-console | figma-design | борд-референс ожидаемых блоков (ступень 1 приёмки) |
| node-repl/IAB | control-browser | другой тулчейн, вне этого скилла |
| lost-pixel | lost-pixel | pixel-diff против baseline; комплементарен |

## Ops

Параллельные инстансы mcp-web-inspector требуют уникального
`--user-data-dir` (SingletonLock; см. front/AGENTS.md Myfriend); сам скилл
последовательный, параллелизм не реализует и не обещает.
