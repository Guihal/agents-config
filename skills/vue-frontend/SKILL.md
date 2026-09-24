---
name: vue-frontend
description: >
  Справочник вёрстки на Vue 3: деление на компоненты (уровни L0–L4, пороги
  сплита, границы извлечения логики), provide/inject-контракты, Tailwind v4
  и SCSS в SFC. Подключается при вёрстке или ревью Vue-компонентов, при
  выборе, как разбивать SFC и чем стилизовать. State-менеджмент, роутинг
  и тестирование — вне объёма. Progressive disclosure: законы и индекс —
  здесь, детали — в references/.
  Triggers: "vue", "SFC", "вёрстка vue", "разбить компонент",
  "provide/inject", "tailwind v4", "scss в vue", "пороги сплита".
---

# Vue Frontend — компоненты, DI-контракты, стилизация SFC

Правила ниже — дефолт; проектные правила (CLAUDE.md/AGENTS.md репо) сильнее
при конфликте. Числовые пороги — ориентиры, не абсолюты.

## Законы

1. **Колокация SFC — дефолт.** Template + script + style живут в одном .vue;
   рост сложности — через composables и подкомпоненты, не через разнос файлов.
   `src`-импорт частей — только для исключительно больших файлов (500+ строк),
   и сначала подумать о сплите компонента.
2. **У компонента есть уровень L0–L4**, и уровень определяет его права:
   Page читает store read-only; Feature — оркестратор и host `provide()`;
   Controller связывает фичу с UI; Humble — чистая презентация props+emit
   (store и composables запрещены); Atomic — дизайн-примитив без детей
   (анатомия элементов — в `ui-standards`). Таблица и дерево назначения —
   `references/component-levels.md`.
3. **Props не пробрасываются глубже 1 уровня.** Дальше — provide/inject
   (координация внутри поддерева фичи) или store (общее бизнес-состояние).
   props ≥5 или 3+ handler-пропса — сигнал: собрать связанные в
   объект-состояние (Preserve Whole Object), уйти в provide/inject или
   разбить компонент.
4. **API компонента типовой:** `defineProps<{ ... }>()`,
   `defineEmits<{ ... }>()` с типизированными payload'ами, `defineModel<T>()`
   для любого v-model. Слоты — через `#name` и явный `<template>`.
   PascalCase/kebab-case — как в проекте, единообразно.
5. **Логику извлекать по использованию, не заранее:** 1 использование →
   inline; 2 реальных → кандидат; 3+ → извлекать. Бизнес-логика — в чистом TS
   (core, без импортов из `vue`); реактивность и lifecycle — в тонких
   composables-обёртках. Composable не делает UI-сайд-эффектов (toast/alert) —
   возвращает error state, UI в компоненте.
6. **provide/inject — через типизированный контракт:** `Symbol()` c
   `InjectionKey<T>`, ключи — в отдельных файлах по доменам; наружу от
   провайдера — `readonly()` + явные функции обновления; обязательный
   контракт — обёртка-композабл с содержательным throw. Паттерны —
   `references/provide-inject.md`.
7. **Стилизация: одно решение на компонент.** Tailwind-утилиты в разметке —
   для презентации (= utility-слой css-architecture); scoped SCSS в SFC —
   для component-слоя: состояния, модификаторы, сложные селекторы,
   вендор-стилизация. Граница utility vs component — за `css-architecture`.
   Детали — `references/styling.md`.
8. **Имена классов Tailwind — только полные литералы.** Конкатенация и
   шаблонные строки (`bg-${color}-500`) молча не попадают в production:
   сканер читает исходники как текст. Варианты — через map с полными именами
   классов, условные `:class`-объекты или CSS-переменную через `:style`.

## Индекс references

Читать только нужную тему (не все подряд):

| файл | покрывает |
|---|---|
| `references/component-levels.md` | уровни L0–L4, дерево назначения уровня, пороги сплита и «когда НЕ делить», контракты API компонента, границы извлечения логики |
| `references/provide-inject.md` | typed keys, владелец контракта, дефолты и фабрики, readonly + функции обновления, граница props vs inject vs store |
| `references/styling.md` | Tailwind v4 (CSS-first, `@theme`, `@reference` в SFC), границы utility, scoped SCSS: `:deep()`/`:slotted()`, слои токенов |

## Смежные справочники

Про сами элементы — не здесь; про организацию стилей в целом — не здесь:

- `/home/penis/.agents/skills/ui-standards/SKILL.md` — анатомия, варианты,
  состояния и a11y-минимум конкретных элементов (L4-Atomic живёт по нему).
- `/home/penis/.agents/skills/css-architecture/SKILL.md` — слои токенов
  primitive → semantic → component, section-gap, бюджет специфичности,
  граница utility vs component.

## Инструменты-гейты

Настроено в проекте — запускать; сама настройка — вне скилла:
`vue-tsc --noEmit`; `eslint-plugin-vue` + `@vue/eslint-config-typescript`;
`stylelint` + `stylelint-config-standard-scss`; `prettier-plugin-tailwindcss`.
