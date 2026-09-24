# Geometry gates — исполняемые рецепты (обязательные гейты)

Приоритет правил: где этот файл противоречит harness-lib `design-standard.md`
(§20) или `figma-console-workflow.md`, управляет этот файл. Явно отменяемые
положения легаси: overflow «not a gate» → здесь ОБЯЗАТЕЛЬНЫЙ гейт; шкала
отступов «where repetition warrants» → здесь ОБЯЗАТЕЛЬНАЯ; два разрешения
«optional» → здесь ОБЯЗАТЕЛЬНЫЕ. Все инструменты ниже — из девяти реальных
тулов (`mcp-workflow.md` §1); исполняющая среда и async-дисциплина —
`mcp-workflow.md` §3–5.

Статус: каждый рецепт ниже — **гейт**: непустой результат без явно объявленного
исключения блокирует `ok: true` у worker'а (self-check), critic'а, verifier'а
и MAIN-приёмки. «Техника чтения», «кандидаты на осмотр» — не про этот файл:
исключение действительно, только если оно объявлено в SPEC/намерении
(по узлу или узору: маска, эффект, Ignore auto layout, скрытый слой,
скролл-фрейм, оверлей) — молчаливых исключений нет.

Все рецепты: только чтение, через `figma_execute`, `timeout: 30000`, обходы
чанкуются по фрейму/поддереву (`mcp-workflow.md` §4), узлы собираются видимые
с ненулевым bbox. Каждая находка несёт **node ID + bounds/значения** — никогда
«looks ok». Zero-результат не доказывает случаи вне предиката рецепта (это
ограничение отчёта, не индульгенция).

---

## 1. overflow-walk → `bounds-overflow`

Выход содержимого за границы элемента = ошибка (requirements §3).

Предикат: `absoluteBoundingBox` ребёнка выходит за `absoluteBoundingBox`
родителя более чем на ±0.5px по любой стороне. Скрытые поддеревья
(`visible === false`) пропускаются (само по себе скрытие — отдельное
решение SPEC, не находка этого гейта).

```js
// figma_execute, timeout: 30000; чанк = один экран-фрейм
const root = await figma.getNodeByIdAsync("SCREEN_FRAME_ID");
const TOL = 0.5, bad = [];
function walk(parent, n) {
  if (n.visible === false) return;
  const pb = parent.absoluteBoundingBox, cb = n.absoluteBoundingBox;
  if (pb && cb) {
    const exit = {
      left: +(pb.x - cb.x).toFixed(1),
      top: +(pb.y - cb.y).toFixed(1),
      right: +((cb.x + cb.width) - (pb.x + pb.width)).toFixed(1),
      bottom: +((cb.y + cb.height) - (pb.y + pb.height)).toFixed(1)
    };
    if (exit.left > TOL || exit.top > TOL || exit.right > TOL || exit.bottom > TOL)
      bad.push({ id: n.id, name: n.name, type: n.type, parentId: parent.id,
                 exit, parentClips: parent.clipsContent === true,
                 hasEffects: (n.effects || []).length > 0,
                 isMaskOrInMask: n.isMask === true || parent.isMask === true,
                 absoluteInAutoLayout: parent.layoutMode !== "NONE" &&
                                       n.layoutPositioning === "ABSOLUTE" });
  }
  if (n.children) n.children.forEach(c => walk(n, c));
}
(root.children || []).forEach(c => walk(root, c));
return { root: root.id, total: bad.length, overflows: bad.slice(0, 50) };
```

Улика содержит поля для решения об исключении (`parentClips`, `hasEffects`,
`isMaskOrInMask`, `absoluteInAutoLayout`), но само исключение берётся из
SPEC/намерения, не из полей: маски, декоративные эффекты, Ignore auto layout,
скролл-фреймы, намеренный bleed — только если объявлены. Режем скрытые слои —
пропущены выше; «спрятал, чтобы не нашлось» — отдельный дефект SPEC.

## 2. element-collision → `element-collision`

Пересечения элементов отлавливаются (requirements §3, §6). Порт алгоритма
`layout_collisions` сниффера ui-audit на Figma-геометрию.

Предикат-иллюстрация: пересечение непусто **И** перекрытие по обеим осям
строго > 5px **И** ни один из узлов не содержит другого (ancestor ↔ descendant
containment не коллизия). Пары классифицируются: `siblings` | `cross-branch`.
Кап отчёта — 25 пар.

```js
// figma_execute, timeout: 30000; чанк = один экран-фрейм. При > ~600 узлов —
// батчирование batch × prefix: чанк i сравнивается со своими узлами И с
// накопленными узлами чанков 0..i−1 (перекрёстные cross-branch-пары между
// чанками не теряются), найденное копится между вызовами по id пары
const root = await figma.getNodeByIdAsync("SCREEN_FRAME_ID");
const items = [];
function collect(n) {
  if (n.visible === false) return;
  const b = n.absoluteBoundingBox;
  if (b && b.width > 0 && b.height > 0) items.push({ n, b });
  if (n.children) n.children.forEach(collect);
}
collect(root);
function contains(anc, desc) {
  for (let p = desc.parent; p; p = p.parent) if (p === anc) return true;
  return false;
}
const out = [];
let truncated = false;
for (let i = 0; i < items.length && !truncated; i++) {
  for (let j = i + 1; j < items.length; j++) {
    const A = items[i], B = items[j], a = A.b, b = B.b;
    if (a.x >= b.x + b.width || b.x >= a.x + a.width) continue;
    if (a.y >= b.y + b.height || b.y >= a.y + a.height) continue;
    const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    if (ix <= 5 || iy <= 5) continue;
    if (contains(A.n, B.n) || contains(B.n, A.n)) continue;
    out.push({ a: { id: A.n.id, name: A.n.name, type: A.n.type },
               b: { id: B.n.id, name: B.n.name, type: B.n.type },
               intersection: { w: Math.round(ix), h: Math.round(iy) },
               relationship: A.n.parent === B.n.parent ? "siblings" : "cross-branch" });
    if (out.length >= 25) { truncated = true; break; }
  }
}
return { root: root.id, scanned: items.length, total: out.length,
         truncated, collisions: out };
```

Кап 25 — кап отчёта одного вызова, не кап детекции: `total` считается до
среза, а `truncated: true` означает «обход оборван по капу/таймауту» — гейт
при `truncated` не проходит, требуется продолжение обхода (batch × prefix)
до полного покрытия пар.

Оверлеи по дизайну (бейдж на углу карточки, кросс-веточный бар над контентом)
— законны ТОЛЬКО как явно объявленное в SPEC исключение (по узору с указанием
пар); необъявленная пара — finding независимо от визуальной «красивости».

## 3. capacity-проверка (до сборки — доказательство вместимости)

Из §B frontend-layout: для простых непересекающихся рядов сумма минимальных
ширин элементов + gaps + padding обязана влезать в ширину контейнера;
координаты не решают capacity-противоречие.

- **До сборки** (worker, по SPEC): арифметика по строкам/рядам макета:
  Σ(min-ширин элементов; для hug — оценка контента, для fill — минимум по
  SPEC) + Σ(gaps) + paddings ≤ контентная ширина контейнера (для
  desktop- и mobile-ширины отдельно). Не влезает → композиция меняется
  (рефлоу/перенос/скролл по SPEC) до строительства, а не после гейта.
- **После сборки** (тот же предикат на измеренных значениях): для каждого
  горизонтального auto-layout контейнера с `layoutWrap === "NO_WRAP"` —
  Σ(ширин детей с `layoutPositioning !== "ABSOLUTE"`) + itemSpacing×(n−1) +
  paddings ≤ width контейнера (±0.5px); wrap-контейнеры проверяются
  построчно — каждая строка wrap'а как отдельный ряд (дети строки + gap'ы
  строки ≤ ширина контейнера); вертикальные аналогично по высоте там, где
  высота зафиксирована. ABSOLUTE-дети вне потоковой суммы (их позиции гейтит
  spacing-walk). Проверяется в чанке того же overflow-walk-обхода
  либо отдельным `figma_execute` по поддереву; улитика — id контейнера,
  сумма, ширина.

## 4. spacing-walk → `spacing-scale-violation`

Все layout-числа — из шкалы (tokens-contract §1: дефолт 4/8, проектный
token-файл переопределяет; SCALE берётся из SPEC/MANIFEST, не из головы).

Источники значений: `itemSpacing` (gap), `counterAxisSpacing` (row-gap
wrap-контейнера), `paddingLeft/Right/Top/Bottom`, плюс смещения детей с
`layoutPositioning === "ABSOLUTE"` внутри auto-layout родителя (x/y
относительно родителя).

```js
// figma_execute, timeout: 30000; чанк = один экран-фрейм
const root = await figma.getNodeByIdAsync("SCREEN_FRAME_ID");
const SCALE = [0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80]; // из token-файла/SPEC
const bad = [];
function inScale(v) { return SCALE.includes(v); }
function walk(n) {
  if (n.visible === false) return;
  const vals = [];
  if (typeof n.itemSpacing === "number") vals.push(["itemSpacing", n.itemSpacing]);
  if (typeof n.counterAxisSpacing === "number") vals.push(["counterAxisSpacing", n.counterAxisSpacing]);
  for (const k of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"])
    if (typeof n[k] === "number") vals.push([k, n[k]]);
  for (const [prop, v] of vals)
    if (!inScale(v)) bad.push({ id: n.id, name: n.name, prop, value: v });
  if (n.children) for (const c of n.children) {
    if (c.visible !== false && n.layoutMode !== "NONE" &&
        c.layoutPositioning === "ABSOLUTE" && (!inScale(c.x) || !inScale(c.y)))
      bad.push({ id: c.id, name: c.name, prop: "absoluteOffset",
                 value: { x: c.x, y: c.y } });
    walk(c);
  }
}
walk(root);
return { root: root.id, scale: SCALE, total: bad.length, violations: bad.slice(0, 50) };
```

## 5. off-token-walk → `off-token-value`

Цвета/шрифты/эффекты/лейаут-метрики — биндинг к variables/styles
(tokens-contract §2–3, §5). Сырой литерал, совпадающий с токеном числом,
паритетом не является.

Паттерн (свойства по живому API; если поле отсутствует в рантайме — см.
`mcp-workflow.md` §5 про фолбэк и `unverifiable`):

```js
// figma_execute, timeout: 30000; чанк = один экран-фрейм/поддерево
const root = await figma.getNodeByIdAsync("SCREEN_FRAME_ID");
const out = [];
function bound(n, key) { const b = n.boundVariables || {}; return !!(b[key] &&
  (Array.isArray(b[key]) ? b[key].length : true)); }
function styleSet(id) { return Array.isArray(id) ? id.length > 0 : !!id; }
function walk(n) {
  if (n.visible === false) return;
  const issues = [];
  // цвета: fills/strokes
  for (const [prop, arr, varKey, styleKey] of [
    ["fills", n.fills, "fills", "fillStyleId"],
    ["strokes", n.strokes, "strokes", "strokeStyleId"]]) {
    if (!Array.isArray(arr)) continue;
    const hasVar = bound(n, varKey), hasStyle = styleSet(n[styleKey]);
    const raw = arr.some(p => p && p.visible !== false && p.type !== "IMAGE");
    if (raw && !hasVar && !hasStyle)
      issues.push({ prop, detail: "unbound paint" });
  }
  // эффекты
  if ((n.effects || []).some(e => e.visible !== false) &&
      !bound(n, "effects") && !styleSet(n.effectStyleId))
    issues.push({ prop: "effects", detail: "unbound effect" });
  // типографика
  if (n.type === "TEXT") {
    const boundType = bound(n, "fontSize") || bound(n, "lineHeight") ||
                      bound(n, "fontFamily");
    if (!boundType && !styleSet(n.textStyleId) && !inKitInstance(n))
      issues.push({ prop: "typography", detail: "unbound text" });
  }
  // layout-метрики: число есть → обязателен биндинг (tokens-contract §2);
  // ноль не флагается — отсутствие отступа, не литерал токена
  for (const key of ["itemSpacing", "counterAxisSpacing", "paddingLeft",
                     "paddingRight", "paddingTop", "paddingBottom",
                     "minWidth", "maxWidth", "minHeight", "maxHeight"]) {
    if (typeof n[key] === "number" && n[key] !== 0 && !bound(n, key))
      issues.push({ prop: key, detail: "unbound layout value", value: n[key] });
  }
  if (issues.length) out.push({ id: n.id, name: n.name, type: n.type, issues });
  if (n.children) n.children.forEach(walk);
}
function inKitInstance(n) {
  for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true;
  return false;
}
walk(root);
return { root: root.id, total: out.length, unbound: out.slice(0, 50) };
```

Гейт: сырые значения на экранах/в ките — finding, кроме явно объявленных в
SPEC декоративных локальных исключений (ui-kit-contract §9). Голая
типографика мимо роли текст-кита дополнительно ловится рецептом 6;
layout-числа без биндинга — веткой `unbound layout value` этого рецепта
(spacing-walk проверяет только попадание в шкалу, не биндинг — вместе они
закрывают «токены везде» без дыр).

## 6. bare-text scan → `bare-text`

Каждый текст в экране — инстанс роли текст-кита (ui-kit-contract §3).

```js
// figma_execute, timeout: 30000; чанк = один экран-фрейм
const root = await figma.getNodeByIdAsync("SCREEN_FRAME_ID");
// инвентарь кита строится в рантайме из MANIFEST kit.sectionNodeId:
const kitSection = await figma.getNodeByIdAsync(KIT_SECTION_NODE_ID);
const KIT = new Set();
if (kitSection)
  for (const c of kitSection.findAllWithCriteria({ types: ["COMPONENT"] }))
    KIT.add(c.id); // componentId инстанса указывает на COMPONENT внутри секции/сета
const out = [], pending = [];
function inInstance(n) {
  for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return p;
  return null;
}
function walk(n) {
  if (n.visible === false) return;
  if (n.type === "TEXT") {
    const inst = inInstance(n);
    if (!inst)
      out.push({ id: n.id, reason: "no-instance",
                 chars: (n.characters || "").slice(0, 40),
                 parentId: n.parent ? n.parent.id : null,
                 parentName: n.parent ? n.parent.name : null });
    else if (!KIT.has(inst.componentId))
      pending.push({ id: n.id, instanceId: inst.id, componentName: inst.name,
                     componentId: inst.componentId,
                     chars: (n.characters || "").slice(0, 40) });
  }
  if (n.children) n.children.forEach(walk);
}
walk(root);
// не найден в локальном ките ≠ нарушение: опубликованный библиотечный
// компонент (непустой component.key) легитимен — SKILL.md разрешает
// imported/shared library без локальных дубликатов
for (const p of pending) {
  const comp = await figma.getNodeByIdAsync(p.componentId);
  if (!(comp && comp.key))
    out.push({ ...p, reason: "instance-not-kit" });
}
return { root: root.id, kitCount: KIT.size, total: out.length, bare: out.slice(0, 50) };
```

TEXT внутри инстанса — легален, когда инстанс принадлежит киту (`componentId`
∈ инвентаря, собранного в рантайме из `kit.sectionNodeId` MANIFEST: COMPONENT-узлы
секции кита, вкл. варианты) или это опубликованный библиотечный компонент
(непустой `component.key`; imported/shared library без локальных дубликатов).
Иначе — `reason: "instance-not-kit"`; строгий SPEC может сузить легитимные
библиотеки явным списком в MANIFEST.

## 7. detached-copy scan → `detached-copy`

Анатомический дубликат компонента с type ≠ INSTANCE (или имя `… copy`) —
копия мимо кита (ui-kit-contract §8).

Эвристика (пары признаков усиливают друг друга; итог — вердикт по совокупности,
каждая находка несёт улику):

```js
// figma_execute, timeout: 30000; чанк = один экран-фрейм
const root = await figma.getNodeByIdAsync("SCREEN_FRAME_ID");
const out = [];
function fingerprint(n) { // структура первого уровня: type:name:порядок
  return (n.children || []).map(c => c.type + ":" + c.name).join("|");
}
const kit = new Map(); // инвентарь кита: id -> fingerprint (из MANIFEST/исследования)
for (const [cid, fp] of Object.entries(KIT_FINGERPRINTS)) kit.set(cid, fp);
function walk(n) {
  if (n.visible === false) return;
  const nameCopy = / copy( \d+)?$/.test(n.name);
  if (n.type !== "INSTANCE" && (nameCopy || kitHasAnatomy(kit, n, fingerprint(n))))
    out.push({ id: n.id, name: n.name, type: n.type,
               fp: fingerprint(n).slice(0, 120), reason: nameCopy ?
                    "copy-name" : "anatomy-match" });
  if (n.children) n.children.forEach(walk);
}
function kitHasAnatomy(kit, n, fp) {
  for (const kp of kit.values()) if (kp && kp === fp) return true;
  return false;
}
walk(root);
return { root: root.id, total: out.length, copies: out.slice(0, 50) };
```

`KIT_FINGERPRINTS` — снимок анатомий кит-компонентов (id → fingerprint),
MAIN/worker берёт из MANIFEST/инвентаризации кита; пустой кит делает рецепт
no-op (и это само по себе провал кит-контракта, см. `missing-design-system`
из скелета).

## 8. viewport-check → `viewport-missing`

Каждый экран существует в двух разрешениях; оба фрейма — настоящие FRAME с
геометрией по контракту (design-standard §17 в части требований к типу узла;
числа — из MANIFEST `viewportContract`, дефолт desktop 1440×900 / mobile
390×844, SPEC может переопределить).

Проверка по MANIFEST (структурное чтение, `figma_execute` read-only):

```js
const targets = MANIFEST_TARGETS; // [{id, desktopNodeId, mobileNodeId}]
const contract = VIEWPORT_CONTRACT; // { desktop:{width,height}, mobile:{...} }
const out = [];
for (const t of targets) {
  for (const [vp, nodeId] of [["desktop", t.desktopNodeId],
                              ["mobile", t.mobileNodeId]]) {
    if (!nodeId) { out.push({ target: t.id, viewport: vp, problem: "missing" }); continue; }
    const n = await figma.getNodeByIdAsync(nodeId);
    if (!n) { out.push({ target: t.id, viewport: vp, problem: "node-gone", nodeId }); continue; }
    if (n.type !== "FRAME") out.push({ target: t.id, viewport: vp,
      problem: "wrong-type", actual: n.type, nodeId });
    else if (Math.abs(n.width - contract[vp].width) > 0.5 ||
             Math.abs(n.height - contract[vp].height) > 0.5)
      out.push({ target: t.id, viewport: vp, problem: "geometry",
      actual: { w: n.width, h: n.height },
      expected: contract[vp], nodeId });
  }
  // вложенность desktop↔mobile запрещена (design-standard §17):
  // ни один из пары не может быть предком другого
  if (t.desktopNodeId && t.mobileNodeId) {
    const d = await figma.getNodeByIdAsync(t.desktopNodeId);
    const m = await figma.getNodeByIdAsync(t.mobileNodeId);
    const hasAncestor = (node, ancestorId) => {
      for (let p = node && node.parent; p; p = p.parent)
        if (p.id === ancestorId) return true;
      return false;
    };
    if (d && m && (hasAncestor(m, d.id) || hasAncestor(d, m.id)))
      out.push({ target: t.id, problem: "nested-viewports",
                 desktopNodeId: d.id, mobileNodeId: m.id });
  }
}
return { total: out.length, violations: out };
```

Дополнение к числам: оба фрейма экрана собираются из одного кита — это
покрывают рецепты 6–7 на каждом фрейме отдельно. Мобильный экран внутри
десктопного фрейма (и любое обратное вложение пары) ловится здесь как
`nested-viewports`.

## 9. figma_lint_design — обязательный линт

На **каждом затронутом фрейме** вызывается `figma_lint_design` с группами
`rules: ["design-system", "layout"]` (обязательный минимум; группы `wcag` и
`best-practice` — по capability-use policy: применимо → включать). Вызов
дешёвый, детерминированный; результаты:

- критическое структурное finding, которое исполнитель не может опровергнуть,
  блокирует `ok: true` (как и все гейты этого файла);
- маппинг на классы этого файла: `hardcoded-color` → `off-token-value`;
  `no-text-style` → `off-token-value`; `token-misuse` → `off-token-value`;
  `detached-component` → `detached-copy`; `no-autolayout` → нарушение
  auto-layout-мандата (ui-kit-contract §5) — фиксируется как finding гейта;
  `default-name` → naming-блокер (скелет §19); `empty-container` →
  структурный мусор, убрать или наполнить;
- линт — обязательная, но не единственная улика: собственные обходы 1–8
  остаются вердиктом по геометрии (линт не заменяет предикаты, предикаты не
  отменяют линт).

---

## Классы находок (канонические определения; дублируются в design-* ролях)

- `bounds-overflow` — `absoluteBoundingBox` дочернего узла выходит за
  `absoluteBoundingBox` родителя более чем на ±0.5px по любой стороне без
  явно объявленного в SPEC/намерении исключения (маска, эффект, Ignore auto
  layout, скрытый слой, скролл-фрейм, намеренный bleed).
- `element-collision` — два видимых элемента одного фрейма пересекаются более
  чем на 5×5px, ни один не содержит другого (relationship: `siblings` или
  `cross-branch`), и это пересечение не объявлено в SPEC как намеренный
  оверлей.
- `spacing-scale-violation` — layout-значение (gap, padding, offset) не входит
  в проектную шкалу отступов (дефолт 4/8 из tokens-contract §1; проектный
  token-файл переопределяет) и не объявлено исключением.
- `off-token-value` — цветовой/типографический/эффектный/layout-литерал
  применён без биндинга к переменной или стилю, существующим в токен-зеркале
  (tokens-contract), без явно объявленного декоративного исключения; raw-копия
  значения токена без биндинга включена в класс.
- `bare-text` — TEXT-узел внутри экранного фрейма, не являющийся частью
  инстанса текст-кита/кит-компонента (текст мимо типографической роли).
- `detached-copy` — узел, дублирующий анатомию существующего кит-компонента
  (или носящий имя `… copy`), тип которого не `INSTANCE`.
- `viewport-missing` — у экрана отсутствует требуемый viewport-фрейм
  (desktop или mobile), либо он не `FRAME`, либо его геометрия не совпадает с
  MANIFEST `viewportContract`.

## Правило улик

Каждая находка: node ID (пара ID для коллизии), bounds/значения, рецепт.
Каждый «чистый» результат: рецепт + root node ID + scanned/total. Findings
формулируются по классам выше; рецензент (critic/verifier/validator) повторяет
рецепты сам — чужие обходы не улика.
