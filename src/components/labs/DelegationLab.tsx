'use client';

import { useState } from 'react';
import {
  DELEGATION_HOOK,
  DELEGATION_INTRO,
  DELEGATION_NOTES,
  DELEGATION_STEPS,
} from '@/data/delegation';
import { CodeBlock, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 09「委派系统」：委派时序步进器。
// DELEGATE→SPAWN→CHILD LOOP→RETURN→AGGREGATE，另设 background / batch / role 三小节。
export default function DelegationLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:delegation'];
  const initial =
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : DELEGATION_STEPS[0].id;
  const [stepId, setStepId] = useState(initial);

  const step = DELEGATION_STEPS.find((s) => s.id === stepId) ?? DELEGATION_STEPS[0];
  const idx = DELEGATION_STEPS.findIndex((s) => s.id === step.id);

  function select(id: string) {
    setStepId(id);
    setLabResult('lab:delegation', { step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{DELEGATION_INTRO}</p>

      <div className="mt-8">
        <Stepper
          steps={DELEGATION_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={select}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
            STEP {idx + 1}/{DELEGATION_STEPS.length} · {step.label}
          </p>
          <h3 className="mt-2 font-serif text-2xl">{step.title}</h3>
          <p className="mt-3 leading-relaxed text-ink/75">{step.body}</p>
          <div className="mt-5">
            <CodeBlock
              file={step.code.file}
              lines={step.code.lines}
              code={step.code.snippet}
              note={step.code.note}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">事件流</p>
            <ul className="mt-3 space-y-2.5">
              {step.events.map((e) => (
                <li key={e.name} className="text-sm">
                  <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-ember">
                    {e.name}
                  </code>
                  <span className="ml-2 text-ink/70">{e.desc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">要点</p>
            <ul className="mt-3 space-y-2">
              {step.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <span className="mt-0.5 text-acid">▸</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => select(DELEGATION_STEPS[idx - 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              ‹ 上一步
            </button>
            <button
              type="button"
              disabled={idx === DELEGATION_STEPS.length - 1}
              onClick={() => select(DELEGATION_STEPS[idx + 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              下一步 ›
            </button>
          </div>
        </div>
      </div>

      <SectionHeading kicker="深入" title="异步、并行与角色分层" />
      <div className="mt-6 space-y-6">
        {DELEGATION_NOTES.map((n) => (
          <div key={n.id} className="rounded-lg border border-line bg-white p-6">
            <p className="font-mono text-[11px] tracking-[0.15em] text-ember">{n.kicker}</p>
            <h4 className="mt-2 font-serif text-xl">{n.title}</h4>
            <div className="mt-4 grid gap-5 xl:grid-cols-2">
              <div>
                <p className="text-sm leading-relaxed text-ink/75">{n.body}</p>
                <ul className="mt-4 space-y-2">
                  {n.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                      <span className="mt-0.5 text-acid">▸</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <CodeBlock file={n.code.file} code={n.code.snippet} note={n.code.note} />
            </div>
          </div>
        ))}
      </div>

      <SectionHeading kicker="记忆钩子" title="一句话记住委派" />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {DELEGATION_HOOK}
      </p>
    </section>
  );
}
