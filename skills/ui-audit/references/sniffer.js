// Layout sniffer v2 — вызывается через playwright_browser_evaluate как arrow function.
// Выдача — кандидаты для проверки, не готовые вердикты. Импортируется из SKILL.md
// напрямую; этот файл — file-relative mirror для удобства (изменять синхронно с inline-копией).

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
