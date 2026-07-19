'use client';

import { useState } from 'react';
import {
  CRON_HARDENING,
  CRON_INTRO,
  CRON_PRESETS,
  CRON_VERBS,
  SCHEDULE_FORMATS,
  TICK_STEPS,
} from '@/data/cron';
import { explainCron } from '@/lib/cron-explain';
import { SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 12「Cron 定时调度」：cron 表达式实验室 + 四种调度格式 + tick 流程。
export default function CronLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:cron'];
  const savedState =
    saved && typeof saved === 'object' ? (saved as { expr?: unknown; step?: unknown }) : undefined;
  const [expr, setExpr] = useState(
    typeof savedState?.expr === 'string' ? savedState.expr : CRON_PRESETS[0],
  );
  const [stepId, setStepId] = useState(
    typeof savedState?.step === 'string' ? savedState.step : TICK_STEPS[0].id,
  );

  const result = explainCron(expr);
  const step = TICK_STEPS.find((s) => s.id === stepId) ?? TICK_STEPS[0];

  function pickExpr(next: string) {
    setExpr(next);
    setLabResult('lab:cron', { expr: next, step: stepId });
  }
  function pickStep(id: string) {
    setStepId(id);
    setLabResult('lab:cron', { expr, step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{CRON_INTRO}</p>

      <SectionHeading kicker="表达式实验室" title="把 cron 表达式拆开看" />
      <div className="mt-5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          {CRON_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => pickExpr(p)}
              className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                p === expr
                  ? 'border-ink bg-ink text-acid'
                  : 'border-line bg-white text-ink/70 hover:border-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={expr}
          onChange={(e) => pickExpr(e.target.value)}
          placeholder="分 时 日 月 周，如 0 9 * * *"
          spellCheck={false}
          className="mt-3 w-full rounded-lg border border-line bg-white px-4 py-3 font-mono text-lg tracking-wider focus:border-ink focus:outline-none"
        />
        {result.ok ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {result.fields.map((f) => (
              <div key={f.key} className="rounded-lg border border-line bg-white p-3">
                <p className="font-mono text-[11px] text-muted">{f.label}</p>
                <p className="mt-0.5 font-mono text-sm text-ember">{f.raw}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/75">{f.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-red/40 bg-red/5 px-4 py-3 font-mono text-sm text-red">
            ✗ {result.error}
          </p>
        )}
      </div>

      <SectionHeading kicker="四种格式" title="Hermes 接受的调度写法" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {SCHEDULE_FORMATS.map((f) => (
          <div key={f.id} className="rounded-lg border border-line bg-white p-4">
            <p className="font-medium">{f.name}</p>
            <p className="mt-1 font-mono text-xs text-ember">{f.examples.join('　·　')}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{f.desc}</p>
          </div>
        ))}
      </div>

      <SectionHeading kicker="tick 流程" title="调度器的一拍" />
      <div className="mt-5">
        <Stepper
          steps={TICK_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={pickStep}
        />
        <div className="mt-4 max-w-3xl rounded-lg border border-line bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h4 className="font-serif text-xl">{step.title}</h4>
            <code className="font-mono text-xs text-blue">{step.sourceRef}</code>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{step.body}</p>
        </div>
      </div>

      <SectionHeading kicker="加固不变量" title="调度器不允许发生的事" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CRON_HARDENING.map((h) => (
          <div key={h.title} className="rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-sm text-ink">✓ {h.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{h.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-3xl rounded-lg border border-acid bg-acid/10 p-4 font-mono text-sm leading-relaxed">
        管理入口：agent 用 cronjob 工具，用户用 hermes cron &lt;{CRON_VERBS.join(' | ')}&gt; 或
        /cron 斜杠命令。
      </p>
    </section>
  );
}
