# Phase 0 Part 1 — Foundation, Progress & M0 Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working, locally-deployable Astro + Starlight tutorial site with the progress-tracking infrastructure and the three interactive components needed for the M0 (认识 Hermes) vertical slice, plus enough real Chinese M0 content to validate the full learning loop end-to-end.

**Architecture:** Astro + Starlight (docs skeleton, sidebar, search, i18n) with React islands for interactivity. A versioned `localStorage` progress store (with `useSyncExternalStore` subscription) backs all interactive components. Starlight's `Header` component is wrapped via the `components` override to inject a global progress bar on every page. No backend — pure static site, deployable via `npm run preview` or Docker/nginx.

**Tech Stack:** Astro 5, @astrojs/starlight, @astrojs/react, @astrojs/mdx, React 19, TypeScript, Vitest (jsdom), Prettier, ESLint, Docker + nginx.

**Spec:** `docs/superpowers/specs/2026-07-19-hermes-tutorial-website-design.md`

**Scope:** This is **Phase 0 Part 1**. Part 2 (a separate plan) will add `<SourceRead>`, `<PyDemo>`, `<BuildExercise>`, `<InterviewQ>`, the Pyodide runner, structure validators, and the Pyodide CI script. Together both parts fulfill the spec's Phase 0 Definition of Done.

---

## File Structure

```
hermes-tutorial/
├── package.json                          # deps + scripts
├── astro.config.mjs                      # Starlight + react + mdx, Header override, sidebar
├── tsconfig.json                         # strict + react jsx
├── vitest.config.ts                      # jsdom env
├── eslint.config.mjs                     # flat config, .ts/.tsx
├── .prettierrc.json
├── .prettierignore
├── .npmrc
├── Dockerfile                            # multi-stage build → nginx
├── docker-compose.yml
├── nginx.conf
├── .github/workflows/ci.yml
├── README.md
├── public/
│   └── favicon.svg
├── src/
│   ├── env.d.ts
│   ├── styles/
│   │   └── custom.css                    # Starlight customCss hook (progress bar tweaks)
│   ├── components/
│   │   ├── overrides/
│   │   │   └── Header.astro              # wraps Starlight default Header, injects ProgressBar
│   │   ├── ProgressBar.tsx               # global progress display + reset
│   │   ├── Checkpoint.tsx                # mark section complete
│   │   ├── Quiz.tsx                      # single/multiple choice with feedback
│   │   └── TryIt.tsx                     # terminal command + "I ran it" checkbox
│   ├── lib/
│   │   ├── progress.ts                   # localStorage store + subscribe/getSnapshot
│   │   └── judge.ts                      # pure quiz-judging logic
│   └── content/docs/
│       ├── index.mdx                     # landing page (splash hero)
│       ├── demo/
│       │   └── components.mdx            # showcase all components
│       └── m0-overview/
│           ├── what-is-hermes.mdx
│           └── install-and-first-chat.mdx
├── scripts/                              # (Part 2 will add validate-pydemos.mjs)
└── tests/
    └── lib/
        ├── progress.test.ts
        └── judge.test.ts
```

**Responsibilities:**
- `lib/progress.ts` — the single source of truth for learning progress; pure-ish module with external store API. All components read/write through it.
- `lib/judge.ts` — pure function, no React, fully unit-tested.
- `components/*.tsx` — thin React islands: render UI, delegate state to `progress.ts`, delegate quiz logic to `judge.ts`.
- `components/overrides/Header.astro` — the only place global chrome is customized; renders Starlight's real Header then the ProgressBar.
- `content/docs/**` — MDX lessons; import components and use them as JSX tags.

---

## Task 1: Bootstrap Astro + Starlight project

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`
- Create: `src/content/docs/index.mdx`
- Create: `.npmrc`
- Create: `public/favicon.svg`

- [ ] **Step 1: Create `.npmrc`**

```
engine-strict=true
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "hermes-tutorial",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [ ] **Step 3: Install dependencies (runtime)**

Run:
```bash
npm install astro@latest @astrojs/starlight@latest @astrojs/react@latest @astrojs/mdx@latest react@latest react-dom@latest
```
Expected: a `package-lock.json` is created and the packages appear under `dependencies` in `package.json`.

- [ ] **Step 4: Install dependencies (dev)**

Run:
```bash
npm install -D typescript@latest @types/react@latest @types/react-dom@latest @astrojs/check@latest vitest@latest jsdom@latest eslint@latest @eslint/js@latest typescript-eslint@latest prettier@latest prettier-plugin-astro@latest
```
Expected: packages appear under `devDependencies`.

- [ ] **Step 5: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Hermes Agent 学习教程',
      defaultLocale: 'zh',
      locales: { zh: { label: '简体中文', lang: 'zh-CN' } },
      components: {
        Header: './src/components/overrides/Header.astro',
      },
      sidebar: [
        { label: '认识 Hermes', autogenerate: { directory: 'm0-overview' } },
        { label: '组件演示', autogenerate: { directory: 'demo' } },
      ],
    }),
    mdx(),
    react(),
  ],
});
```

> Note: The `Header` override file is created in Task 4. The build in Step 8 will fail until then — that is expected; this task only verifies dependencies and base config compile, so we create a placeholder override now.

- [ ] **Step 6: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "tests", ".astro/types.d.ts"],
  "exclude": ["dist"]
}
```

- [ ] **Step 7: Create `src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
```

- [ ] **Step 8: Create placeholder Header override + landing page**

Create `src/components/overrides/Header.astro`:
```astro
---
import Default from '@astrojs/starlight/components/Header.astro';
---
<Default {...Astro.props} />
```

Create `src/content/docs/index.mdx`:
```mdx
---
title: Hermes Agent 学习教程
description: 从用会 Hermes，到深入原理，到自己设计 agent，达到面试要求。
template: splash
hero:
  tagline: 一条从「会用」到「能造」到「能面」的交互式学习主线。
  actions:
    - text: 占位
      link: /
      icon: right-arrow
---

 bootstrap 占位页。
```

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#FFD700"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#111">☤</text></svg>
```

- [ ] **Step 9: Verify the project builds**

Run: `npm run build`
Expected: build succeeds; `dist/index.html` exists.
```bash
ls dist/index.html
```
Expected: path prints (file exists).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: bootstrap astro + starlight project"
```

---

## Task 2: Lint / format / test tooling

**Files:**
- Create: `vitest.config.ts`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': '/src' },
  },
});
```

- [ ] **Step 2: Create `eslint.config.mjs`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist', '.astro', 'node_modules', 'public'],
  },
];
```

- [ ] **Step 3: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-astro"],
  "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }]
}
```

- [ ] **Step 4: Create `.prettierignore`**

```
dist
.astro
node_modules
package-lock.json
```

- [ ] **Step 5: Verify all three tools run (no errors, no tests yet)**

Run: `npm run lint`
Expected: exits 0 (no lint errors; `tests/` and `src/lib/` don't exist yet, nothing to lint beyond config — still exits cleanly).

Run: `npm run format:check`
Expected: may report unformatted files; if so run `npm run format` then re-check until exit 0.

Run: `npm run test`
Expected: vitest runs and reports `No test files found` (exit 1) — that's fine here; once Task 3 adds a test it must pass. Note: if `npm run test` exiting 1 blocks you, proceed — Task 3 fixes it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add prettier, eslint, vitest configs"
```

---

## Task 3: Progress store (TDD)

**Files:**
- Create: `src/lib/progress.ts`
- Test: `tests/lib/progress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/progress.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearProgress,
  completedCount,
  getSnapshot,
  isComplete,
  setItem,
  subscribe,
} from '../../src/lib/progress';

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('progress store', () => {
  it('starts empty', () => {
    expect(completedCount()).toBe(0);
    expect(isComplete('checkpoint:x')).toBe(false);
  });

  it('sets and reads an item', () => {
    setItem('checkpoint:install', true);
    expect(isComplete('checkpoint:install')).toBe(true);
    expect(completedCount()).toBe(1);
  });

  it('persists to localStorage under the versioned key', () => {
    setItem('tryit:first', true);
    const raw = localStorage.getItem('hermes-tutorial:progress:v1');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).items['tryit:first']).toBe(true);
  });

  it('loads existing progress from localStorage on init', async () => {
    localStorage.setItem(
      'hermes-tutorial:progress:v1',
      JSON.stringify({ items: { 'checkpoint:old': true } }),
    );
    vi.resetModules();
    const mod = await import('../../src/lib/progress');
    expect(mod.completedCount()).toBe(1);
    expect(mod.isComplete('checkpoint:old')).toBe(true);
  });

  it('notifies subscribers on change and supports unsubscribe', () => {
    let calls = 0;
    const unsub = subscribe(() => calls++);
    setItem('checkpoint:a', true);
    setItem('checkpoint:a', true); // no-op: same value, no emit
    expect(calls).toBe(1);
    unsub();
    setItem('checkpoint:b', true);
    expect(calls).toBe(1); // unsubscribed
  });

  it('clears all progress', () => {
    setItem('checkpoint:a', true);
    clearProgress();
    expect(completedCount()).toBe(0);
    expect(getSnapshot().items).toEqual({});
  });

  it('degrades gracefully when localStorage throws', () => {
    const original = globalThis.localStorage.setItem;
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: () => {
        throw new Error('quota / private mode');
      },
    });
    expect(() => setItem('checkpoint:safe', true)).not.toThrow();
    expect(isComplete('checkpoint:safe')).toBe(true); // still tracked in-memory
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: original,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "../../src/lib/progress"` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/progress.ts`:
```ts
const STORAGE_KEY = 'hermes-tutorial:progress:v1';

export interface ProgressState {
  items: Record<string, boolean>;
}

const EMPTY: ProgressState = { items: {} };
const listeners = new Set<() => void>();
let state: ProgressState = read();

function read(): ProgressState {
  if (typeof localStorage === 'undefined') return { items: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && parsed.items) {
      return { items: parsed.items as Record<string, boolean> };
    }
    return { items: {} };
  } catch {
    return { items: {} };
  }
}

function write(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode / quota) — keep state in-memory only
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

export function getSnapshot(): ProgressState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setItem(key: string, value: boolean): void {
  if (state.items[key] === value) return;
  state = { items: { ...state.items, [key]: value } };
  write();
  emit();
}

export function isComplete(key: string): boolean {
  return state.items[key] === true;
}

export function completedCount(): number {
  return Object.values(state.items).filter(Boolean).length;
}

export function clearProgress(): void {
  state = EMPTY;
  write();
  emit();
}
```

> Note on `EMPTY`: a shared frozen-ish constant for the cleared state. `getSnapshot` returns `state` by reference; it only changes identity on `setItem`/`clearProgress`, which satisfies React's `useSyncExternalStore` caching requirement.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add versioned localStorage progress store"
```

---

## Task 4: Global ProgressBar + Header override

**Files:**
- Create: `src/components/ProgressBar.tsx`
- Modify: `src/components/overrides/Header.astro`
- Create: `src/styles/custom.css`

- [ ] **Step 1: Create `src/components/ProgressBar.tsx`**

```tsx
import { useSyncExternalStore } from 'react';
import { clearProgress, getSnapshot, subscribe } from '../lib/progress';

export default function ProgressBar() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const count = Object.values(state.items).filter(Boolean).length;

  return (
    <div className="ht-progress">
      <span>📊 学习进度：已完成 {count} 项</span>
      {count > 0 && (
        <button
          type="button"
          className="ht-progress-reset"
          onClick={() => {
            if (confirm('确定要重置全部学习进度吗？')) clearProgress();
          }}
        >
          重置
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/styles/custom.css`**

```css
.ht-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 1rem;
  font-size: 0.85rem;
  background: var(--sl-color-gray-7, #f5f5f5);
  border-bottom: 1px solid var(--sl-color-gray-6, #e0e0e0);
}
.ht-progress-reset {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  color: inherit;
  font: inherit;
}
```

- [ ] **Step 3: Wire the ProgressBar into the Header override**

Replace `src/components/overrides/Header.astro` with:
```astro
---
import Default from '@astrojs/starlight/components/Header.astro';
import ProgressBar from '../ProgressBar.tsx';
---
<Default {...Astro.props} />
<ProgressBar client:idle />
```

- [ ] **Step 4: Register the custom CSS in Starlight config**

In `astro.config.mjs`, inside the `starlight({...})` call, add a `customCss` entry. The final `starlight({...})` block should read:
```js
    starlight({
      title: 'Hermes Agent 学习教程',
      defaultLocale: 'zh',
      locales: { zh: { label: '简体中文', lang: 'zh-CN' } },
      customCss: ['./src/styles/custom.css'],
      components: {
        Header: './src/components/overrides/Header.astro',
      },
      sidebar: [
        { label: '认识 Hermes', autogenerate: { directory: 'm0-overview' } },
        { label: '组件演示', autogenerate: { directory: 'demo' } },
      ],
    }),
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: build succeeds; `dist/index.html` exists.

- [ ] **Step 6: Manual smoke check (dev)**

Run: `npm run dev` then open the printed local URL.
Expected: the page renders with a thin progress bar below the header reading "📊 学习进度：已完成 0 项". Stop the dev server (Ctrl+C) when done.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: inject global ProgressBar via Starlight Header override"
```

---

## Task 5: Checkpoint component

**Files:**
- Create: `src/components/Checkpoint.tsx`

- [ ] **Step 1: Create `src/components/Checkpoint.tsx`**

```tsx
import { useSyncExternalStore } from 'react';
import { getSnapshot, isComplete, setItem, subscribe } from '../lib/progress';

interface CheckpointProps {
  id: string;
  label?: string;
}

export default function Checkpoint({ id, label = '标记本节完成' }: CheckpointProps) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const done = isComplete(`checkpoint:${id}`);
  return (
    <button
      type="button"
      className="ht-checkpoint"
      data-done={done}
      onClick={() => setItem(`checkpoint:${id}`, !done)}
    >
      {done ? '✅ 已完成' : label}
    </button>
  );
}
```

- [ ] **Step 2: Append Checkpoint styles to `src/styles/custom.css`**

Append:
```css
.ht-checkpoint {
  display: block;
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 6px;
  font: inherit;
  border: 1px solid var(--sl-color-gray-5, #bbb);
  background: transparent;
  color: inherit;
}
.ht-checkpoint[data-done='true'] {
  border-color: #2e8b57;
  background: rgba(46, 139, 87, 0.12);
}
```

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: both exit 0; `dist/index.html` exists.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Checkpoint component"
```

---

## Task 6: Quiz component (judge logic TDD first)

**Files:**
- Create: `src/lib/judge.ts`
- Test: `tests/lib/judge.test.ts`
- Create: `src/components/Quiz.tsx`

- [ ] **Step 1: Write the failing test for `judge`**

Create `tests/lib/judge.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { judge } from '../../src/lib/judge';

describe('judge', () => {
  it('single-choice: correct when exactly the right key', () => {
    expect(judge(['b'], ['b'], false)).toBe(true);
  });
  it('single-choice: wrong key', () => {
    expect(judge(['a'], ['b'], false)).toBe(false);
  });
  it('single-choice: selecting more than one is wrong', () => {
    expect(judge(['a', 'b'], ['b'], false)).toBe(false);
  });
  it('multiple-choice: all correct keys, no extras', () => {
    expect(judge(['a', 'c'], ['a', 'c'], true)).toBe(true);
  });
  it('multiple-choice: missing one is wrong', () => {
    expect(judge(['a'], ['a', 'c'], true)).toBe(false);
  });
  it('multiple-choice: an extra wrong key is wrong', () => {
    expect(judge(['a', 'c', 'd'], ['a', 'c'], true)).toBe(false);
  });
  it('empty selection is wrong', () => {
    expect(judge([], ['a'], false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — cannot resolve `../../src/lib/judge`.

- [ ] **Step 3: Write `judge`**

Create `src/lib/judge.ts`:
```ts
export type QuizOption = { key: string; text: string };

export function judge(selected: string[], correct: string[], multiple: boolean): boolean {
  if (selected.length === 0) return false;
  if (!multiple) return selected.length === 1 && selected[0] === correct[0];
  if (selected.length !== correct.length) return false;
  const selectedSet = new Set(selected);
  return correct.every((c) => selectedSet.has(c));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS — all 7 `judge` tests pass (plus the 7 progress tests = 14 total).

- [ ] **Step 5: Create `src/components/Quiz.tsx`**

```tsx
import { useState } from 'react';
import { useSyncExternalStore } from 'react';
import { getSnapshot, setItem, subscribe } from '../lib/progress';
import { judge, type QuizOption } from '../lib/judge';

interface QuizProps {
  id: string;
  question: string;
  options: QuizOption[];
  correct: string[];
  explanation: string;
  multiple?: boolean;
}

export default function Quiz({
  id,
  question,
  options,
  correct,
  explanation,
  multiple = false,
}: QuizProps) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggle(key: string) {
    if (submitted) return;
    setSelected((prev) =>
      multiple
        ? prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key]
        : [key],
    );
  }
  function submit() {
    if (selected.length === 0) return;
    if (judge(selected, correct, multiple)) setItem(`quiz:${id}`, true);
    setSubmitted(true);
  }
  function reset() {
    setSelected([]);
    setSubmitted(false);
  }
  const isCorrect = submitted && judge(selected, correct, multiple);

  return (
    <div className="ht-quiz">
      <p className="ht-quiz-question">{question}</p>
      <ul className="ht-quiz-options">
        {options.map((o) => (
          <li key={o.key}>
            <label>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`quiz-${id}`}
                checked={selected.includes(o.key)}
                onChange={() => toggle(o.key)}
                disabled={submitted}
              />{' '}
              {o.text}
            </label>
          </li>
        ))}
      </ul>
      {!submitted && (
        <button type="button" onClick={submit} disabled={selected.length === 0}>
          提交
        </button>
      )}
      {submitted && (
        <div className="ht-quiz-feedback">
          <p className="ht-quiz-result" data-correct={isCorrect}>
            {isCorrect ? '✅ 正确！' : '❌ 不完全正确'}
          </p>
          <p>{explanation}</p>
          <button type="button" onClick={reset}>
            重试
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Append Quiz styles to `src/styles/custom.css`**

Append:
```css
.ht-quiz {
  border: 1px solid var(--sl-color-gray-5, #bbb);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}
.ht-quiz-question {
  font-weight: 600;
}
.ht-quiz-options {
  list-style: none;
  padding: 0;
}
.ht-quiz-options li {
  margin: 0.25rem 0;
}
.ht-quiz-options label {
  cursor: pointer;
}
.ht-quiz-result[data-correct='true'] {
  color: #2e8b57;
  font-weight: 600;
}
.ht-quiz-result[data-correct='false'] {
  color: #b00020;
  font-weight: 600;
}
```

- [ ] **Step 7: Verify lint + build + tests**

Run: `npm run lint && npm run test && npm run build`
Expected: all exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Quiz component with pure judge logic"
```

---

## Task 7: TryIt component

**Files:**
- Create: `src/components/TryIt.tsx`

- [ ] **Step 1: Create `src/components/TryIt.tsx`**

```tsx
import { useSyncExternalStore } from 'react';
import { getSnapshot, isComplete, setItem, subscribe } from '../lib/progress';

interface TryItProps {
  id: string;
  command: string;
  note?: string;
}

export default function TryIt({ id, command, note }: TryItProps) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const done = isComplete(`tryit:${id}`);

  function copy() {
    navigator.clipboard?.writeText(command).catch(() => {
      /* clipboard unavailable — ignore */
    });
  }

  return (
    <div className="ht-tryit">
      <div className="ht-tryit-title">🖥️ 在终端运行</div>
      <pre className="ht-tryit-cmd">
        <code>{command}</code>
      </pre>
      {note && <p className="ht-tryit-note">{note}</p>}
      <div className="ht-tryit-actions">
        <label>
          <input
            type="checkbox"
            checked={done}
            onChange={() => setItem(`tryit:${id}`, !done)}
          />{' '}
          我在终端跑过了
        </label>
        <button type="button" onClick={copy}>
          复制命令
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append TryIt styles to `src/styles/custom.css`**

Append:
```css
.ht-tryit {
  border: 1px solid var(--sl-color-gray-5, #bbb);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}
.ht-tryit-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.ht-tryit-cmd {
  background: var(--sl-color-gray-7, #f5f5f5);
  padding: 0.5rem;
  border-radius: 4px;
  overflow-x: auto;
}
.ht-tryit-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}
```

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add TryIt component"
```

---

## Task 8: Component demo page + sidebar wiring

**Files:**
- Create: `src/content/docs/demo/components.mdx`
- Replace: `src/content/docs/index.mdx` (real landing page)

- [ ] **Step 1: Create the demo page**

Create `src/content/docs/demo/components.mdx`:
```mdx
---
title: 组件演示
description: 交互组件一览（阶段 0 Part 1）。
---

import TryIt from '../../components/TryIt.tsx';
import Quiz from '../../components/Quiz.tsx';
import Checkpoint from '../../components/Checkpoint.tsx';

本页展示阶段 0 Part 1 提供的三个交互组件。它们都写入浏览器本地进度（见页面顶部进度条）。

## TryIt —— 终端动手

<TryIt id="demo-tryit" command="echo hello && hermes --version" note="把命令复制到你的终端运行。" />

## Quiz —— 知识检查

<Quiz
  id="demo-quiz"
  question="以下哪个是 Hermes Agent 的核心差异化能力？（单选）"
  options={[
    { key: 'a', text: '支持多种 LLM provider' },
    { key: 'b', text: '内置自进化学习循环' },
    { key: 'c', text: '有 TUI 界面' },
  ]}
  correct={['b']}
  explanation="provider 多样、TUI 都是不错的特性，但核心差异化是『自进化学习循环』。"
/>

## Checkpoint —— 节点完成

<Checkpoint id="demo-checkpoint" label="我看完了组件演示" />
```

- [ ] **Step 2: Replace the landing page**

Replace `src/content/docs/index.mdx` with:
```mdx
---
title: Hermes Agent 学习教程
description: 从用会 Hermes，到深入原理，到自己设计 agent，达到面试要求。
template: splash
hero:
  tagline: 一条从「会用」到「能造」到「能面」的交互式学习主线。
  actions:
    - text: 开始学习
      link: /m0-overview/what-is-hermes/
      icon: right-arrow
---

本教程围绕 [Hermes Agent](https://github.com/NousResearch/hermes-agent) —— Nous Research 出品的自进化 AI agent —— 展开。

## 学习主线

1. **了解** Hermes 的各项功能
2. **深入** Hermes 的工作原理
3. 基于原理**自己设计新 agent、扩展 agent 功能**
4. 达到 **AI agent 工程方向的面试要求**

## 模块

- **M0 认识 Hermes**：功能全景、安装上手、第一次对话
- **M1 深入原理**：agent 主循环、技能系统+策展器、工具、记忆、委派、cron/kanban、网关、终端后端
- **M2 基于原理构建**：写技能、加工具、加 provider、写 plugin、从零设计 agent
- **M3 面试冲刺**：高频题、设计题、自评
```

- [ ] **Step 3: Verify build + format**

Run: `npm run format && npm run build`
Expected: build succeeds; `dist/index.html` and `dist/demo/components/index.html` exist.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add component demo page and landing page"
```

---

## Task 9: M0 vertical slice content

**Files:**
- Create: `src/content/docs/m0-overview/what-is-hermes.mdx`
- Create: `src/content/docs/m0-overview/install-and-first-chat.mdx`

Content is adapted (not copied) from the Hermes Agent README (`hermes-agent/README.md`) and official docs into a Chinese learning path.

- [ ] **Step 1: Create `what-is-hermes.mdx`**

Create `src/content/docs/m0-overview/what-is-hermes.mdx`:
```mdx
---
title: 认识 Hermes
description: Hermes 是什么、解决什么问题、核心差异化与功能全景。
---

import Quiz from '../../components/Quiz.tsx';
import Checkpoint from '../../components/Checkpoint.tsx';

## Hermes 是什么

**Hermes Agent** 是 [Nous Research](https://nousresearch.com) 开发的**自进化 AI agent**，用 Python 实现、开源（MIT）。它是目前唯一内置**学习循环**的 agent：从经验中创建技能、在使用中改进技能、主动持久化知识、搜索自己的历史会话，并跨会话逐步建立对你的深度理解。

它可以在一台 5 美元的 VPS、一个 GPU 集群，或几乎闲置零成本的 serverless 基础设施上运行，并且不绑定你的笔记本——你可以从 Telegram 跟它对话，而它在云 VM 上工作。

## 它解决什么问题

大多数 AI agent 用完即弃、每次从零开始。Hermes 的核心差异在于它会**积累**：

- **技能自进化**：复杂任务后自动创建可复用技能，并在使用中自我改进。
- **跨会话记忆**：基于 FTS5 的会话搜索 + LLM 摘要，实现跨会话回忆。
- **用户建模**：借助 [Honcho](https://github.com/plastic-labs/honcho) 的 dialectic modeling，跨会话建立对你的理解。

## 功能全景

| 能力 | 说明 |
| --- | --- |
| 完整 TUI | 多行编辑、斜杠命令自动补全、历史、中断重定向、流式工具输出 |
| 多平台网关 | Telegram / Discord / Slack / WhatsApp / Signal，单一 gateway 进程 |
| 技能系统 | 自进化，兼容 [agentskills.io](https://agentskills.io) 开放标准 |
| 定时自动化 | 内建 cron，自然语言描述、无人值守 |
| 委派与并行 | 派生隔离子 agent；用 RPC 脚本压缩多步流水线 |
| 多终端后端 | local / Docker / SSH / Singularity / Modal / Daytona（后两者支持 serverless 休眠） |
| 模型可切换 | Nous Portal、OpenRouter、OpenAI、自有 endpoint 等，`hermes model` 一键切换 |

<Quiz
  id="what-is-hermes-1"
  question="Hermes Agent 最核心的差异化能力是什么？"
  options={[
    { key: 'a', text: '它支持很多 LLM provider' },
    { key: 'b', text: '内置自进化学习循环：从经验创建并改进技能、跨会话记忆' },
    { key: 'c', text: '它有一个 TUI 界面' },
    { key: 'd', text: '它可以跑在 Docker 里' },
  ]}
  correct={['b']}
  explanation="provider 多样、TUI、Docker 都是不错的特性，但核心差异化是『自进化学习循环』——技能自创建/自改进 + 跨会话记忆 + 用户建模。"
/>

<Checkpoint id="what-is-hermes" label="我理解了 Hermes 是什么" />
```

- [ ] **Step 2: Create `install-and-first-chat.mdx`**

Create `src/content/docs/m0-overview/install-and-first-chat.mdx`:
```mdx
---
title: 安装与第一次对话
description: 安装 Hermes 并完成第一次对话。
---

import TryIt from '../../components/TryIt.tsx';
import Quiz from '../../components/Quiz.tsx';
import Checkpoint from '../../components/Checkpoint.tsx';

## 安装

Linux / macOS / WSL2 / Termux：

<TryIt
  id="install"
  command="curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  note="安装器会自动处理 uv、Python 3.11、Node.js、ripgrep、ffmpeg 等依赖。"
/>

安装完成后重新加载 shell：

<TryIt id="reload-shell" command="source ~/.bashrc   # 或 source ~/.zshrc" />

## 第一次对话

<TryIt id="first-chat" command="hermes" note="启动交互式 CLI，开始第一次对话。" />

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `hermes model` | 选择 LLM provider 与模型 |
| `hermes tools` | 配置启用的工具 |
| `hermes config set` / `get` | 设置 / 读取单个配置项 |
| `hermes gateway` | 启动消息网关（Telegram、Discord 等） |
| `hermes setup` | 一次性完整配置向导 |
| `hermes doctor` | 诊断问题 |

<Quiz
  id="install-1"
  question="下列哪个命令用于启动 Hermes 的交互式对话？"
  options={[
    { key: 'a', text: 'hermes setup' },
    { key: 'b', text: 'hermes' },
    { key: 'c', text: 'hermes doctor' },
    { key: 'd', text: 'hermes tools' },
  ]}
  correct={['b']}
  explanation="直接运行 `hermes` 进入交互式 CLI。setup 是配置向导，doctor 是诊断工具，tools 用于配置启用的工具。"
/>

<Checkpoint id="install-and-first-chat" label="我已安装并完成第一次对话" />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/m0-overview/what-is-hermes/index.html` and `dist/m0-overview/install-and-first-chat/index.html` exist.

- [ ] **Step 4: Manual end-to-end check**

Run: `npm run dev`, open the site, click through: 首页 → 认识 Hermes（做 Quiz、点 Checkpoint）→ 安装与第一次对话（勾选 TryIt）。
Expected: the top progress bar count increments as you complete items; the "重置" button appears once count > 0 and clears progress. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "content(m0): add 认识 Hermes and 安装与第一次对话 lessons"
```

---

## Task 10: Docker local deployment

**Files:**
- Create: `Dockerfile`
- Create: `nginx.conf`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# serve stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Create `nginx.conf`**

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    location ~* \.(?:css|js|svg|png|jpg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  web:
    build: .
    image: hermes-tutorial
    ports:
      - "8080:8080"
```

- [ ] **Step 4: Add `docker-compose.yml` build artifacts to `.dockerignore`**

Create `.dockerignore`:
```
node_modules
dist
.git
.astro
```

- [ ] **Step 5: Verify the image builds**

Run: `docker compose build`
Expected: image builds successfully (requires Docker installed). If Docker is not installed in the environment, skip this step and note it in the handoff — the Dockerfile/compose are still correct and verifiable on a machine with Docker.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: add Dockerfile, nginx config, docker-compose for local deploy"
```

---

## Task 11: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

> Note: `npm ci` requires `package-lock.json`, which Task 1 generated and committed. Pyodide-preset validation (Part 2) and link-checking will be added in later plans.

- [ ] **Step 2: Verify YAML is well-formed**

Run: `node -e "require('fs').readFileSync('.github/workflows/ci.yml','utf8')" && python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo OK`
Expected: prints `OK`. (If python3/yaml unavailable, the `node` read alone is a sufficient syntax-presence check.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: add lint + test + build workflow"
```

---

## Task 12: README + final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# Hermes Agent 学习教程

一个围绕 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的**交互式学习教程网站**，本地部署、纯静态、无后端。

## 主线任务

把 Hermes 当作教学对象，让学习者：

1. **了解** Hermes 的各项功能；
2. **深入** Hermes 的工作原理；
3. 基于原理**自己设计新 agent、扩展 agent 功能**；
4. 达到 **AI agent 工程方向的面试要求**。

模块：M0 认识 Hermes → M1 深入原理 → M2 基于原理构建 → M3 面试冲刺。

## 本地部署

需要 Node.js ≥ 20。

### 1. 开发模式（热更新）

```bash
npm install
npm run dev
```

### 2. 生产预览

```bash
npm run build
npm run preview
```

### 3. Docker 一键部署

```bash
docker compose up --build
```

然后访问 http://localhost:8080 。

## 其他命令

| 命令 | 作用 |
| --- | --- |
| `npm test` | 运行 Vitest 单测 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |
| `npm run check` | Astro 类型检查 |

## 设计文档

- 设计 spec：`docs/superpowers/specs/2026-07-19-hermes-tutorial-website-design.md`
- 实现计划：`docs/superpowers/plans/`
````

- [ ] **Step 2: Run the full verification suite**

Run: `npm run lint && npm run test && npm run build && npm run format:check`
Expected: all four exit 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add README with main task and local deploy guide"
```

---

## Self-Review (completed)

- **Spec coverage (Phase 0 Part 1 subset):**
  - Astro+Starlight init + structure → Task 1 ✓
  - Progress tracking (localStorage) → Task 3 ✓
  - Global progress bar in layout → Task 4 ✓
  - `<Checkpoint>` → Task 5 ✓; `<Quiz>` → Task 6 ✓; `<TryIt>` → Task 7 ✓ (the three components the M0 slice needs)
  - M0 vertical slice content → Task 9 ✓
  - Local deploy (dev/preview/Docker) → Task 1 (dev/build/preview) + Task 10 (Docker) ✓
  - Engineering baseline (git, Prettier, ESLint, Vitest, CI) → Tasks 2, 11 ✓
  - README → Task 12 ✓
  - **Out of scope for Part 1 (deferred to Part 2):** `<SourceRead>`, `<PyDemo>`, `<BuildExercise>`, `<InterviewQ>`, Pyodide runner, structure validators, Pyodide CI script.
- **Placeholder scan:** none — every step has concrete code/commands.
- **Type/name consistency:** progress keys consistently `checkpoint:`/`tryit:`/`quiz:` prefixes across `progress.ts`, `Checkpoint.tsx`, `TryIt.tsx`, `Quiz.tsx`, and content. `judge(selected, correct, multiple)` signature matches between `judge.ts`, its test, and `Quiz.tsx`. `getSnapshot`/`subscribe` signatures match between `progress.ts` and all three `useSyncExternalStore` call sites.
