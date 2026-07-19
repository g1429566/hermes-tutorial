'use client';

// 实验室共享原语：所有章节实验室共用同一套交互骨架，保证 28 章设计语言一致。
// 数据驱动——章节数据在 src/data/*.ts，这里只管渲染与交互状态。

import type { ReactNode } from 'react';

/* ── SectionHeading：实验室内的小节标题 ─────────────────────────── */
export function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mt-12">
      <p className="kicker">{kicker}</p>
      <h3 className="mt-2 font-serif text-2xl">{title}</h3>
    </div>
  );
}

/* ── CodeBlock：暗色代码面板，带文件路径与行号区间 ──────────────── */
export function CodeBlock({
  file,
  lines,
  code,
  note,
}: {
  file: string;
  lines?: string;
  code: string;
  note?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink/20 bg-code-bg text-white">
      <div className="flex items-baseline justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs text-ember">{file}</span>
        {lines && <span className="font-mono text-[11px] text-white/40">{lines}</span>}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-white/85">
        <code>{code}</code>
      </pre>
      {note && <p className="border-t border-white/10 px-4 py-2 text-xs text-white/55">{note}</p>}
    </div>
  );
}

/* ── Stepper：步骤切换（Agent 循环 / 时序 / 调度流程等） ────────── */
export interface StepperStep {
  id: string;
  label: string;
}

export function Stepper({
  steps,
  current,
  onChange,
}: {
  steps: StepperStep[];
  current: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-y-3">
      {steps.map((s, i) => {
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center">
            {i > 0 && <span className="mx-2 font-mono text-muted">→</span>}
            <button
              type="button"
              onClick={() => onChange(s.id)}
              className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
                active
                  ? 'border-ink bg-ink text-acid'
                  : 'border-line bg-white text-ink/70 hover:border-muted'
              }`}
            >
              {s.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Explorer：左列表 + 右详情（架构浏览器同构） ────────────────── */
export interface ExplorerItem {
  id: string;
  name: string;
  tagline?: string;
}

export function Explorer({
  items,
  current,
  onChange,
  children,
}: {
  items: ExplorerItem[];
  current: string;
  onChange: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-2">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
              it.id === current
                ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-acid)]'
                : 'border-line bg-white hover:border-muted'
            }`}
          >
            <p className={`font-medium ${it.id === current ? 'text-acid' : ''}`}>{it.name}</p>
            {it.tagline && (
              <p className={`mt-0.5 text-xs ${it.id === current ? 'text-white/60' : 'text-muted'}`}>
                {it.tagline}
              </p>
            )}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ── CompareSelect：选项卡片网格 + 详情槽（对比/选择类实验室） ──── */
export interface CompareOption {
  id: string;
  name: string;
  tagline?: string;
}

export function CompareSelect({
  options,
  current,
  onChange,
  accent = 'acid',
  children,
}: {
  options: CompareOption[];
  current: string | null;
  onChange: (id: string) => void;
  accent?: 'acid' | 'ember';
  children: ReactNode;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((o) => {
          const active = o.id === current;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                active
                  ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-' +
                    accent +
                    ')]'
                  : 'border-line bg-white hover:border-muted'
              }`}
            >
              <p className={`font-medium ${active ? 'text-' + accent : ''}`}>{o.name}</p>
              {o.tagline && (
                <p className={`mt-1 text-sm ${active ? 'text-white/65' : 'text-muted'}`}>
                  {o.tagline}
                </p>
              )}
            </button>
          );
        })}
      </div>
      {current && <div className="mt-4">{children}</div>}
    </>
  );
}

/* ── DetailPanel：详情面板（深色终端风） ────────────────────────── */
export function DetailPanel({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink/20 bg-code-bg p-6 text-white md:p-8">
      <p className="font-mono text-[11px] tracking-[0.15em] text-acid">{kicker}</p>
      <h3 className="mt-2 font-serif text-2xl md:text-3xl">{title}</h3>
      {children}
    </div>
  );
}

/* ── FlipCard：面试问答翻转卡 ───────────────────────────────────── */
export function FlipCard({
  flipped,
  onFlip,
  front,
  back,
}: {
  flipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  back: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className={`w-full rounded-lg border p-6 text-left transition-colors ${
        flipped ? 'border-acid bg-ink text-white' : 'border-line bg-white hover:border-muted'
      }`}
    >
      {flipped ? back : front}
      <p className={`mt-4 font-mono text-[11px] ${flipped ? 'text-acid' : 'text-muted'}`}>
        {flipped ? '▲ 收起思路' : '▼ 点击翻转，看模范思路'}
      </p>
    </button>
  );
}
