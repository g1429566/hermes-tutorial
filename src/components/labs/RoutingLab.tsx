'use client';

import { useState } from 'react';
import {
  AUX_CONFIG_EXAMPLE,
  AUX_TASKS,
  AUX_TASKS_EN,
  CODEX_CALLOUT,
  CODEX_CALLOUT_EN,
  FAILOVER_LAYERS,
  FAILOVER_LAYERS_EN,
  ROUTING_INTRO,
  ROUTING_INTRO_EN,
  ROUTING_UI,
  TEXT_CHAIN,
  TEXT_CHAIN_EN,
  VISION_CHAIN,
  VISION_CHAIN_EN,
} from '@/data/routing';
import { CodeBlock, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 30「模型路由与凭据池」：三层降级 + 辅助任务解析链。
export default function RoutingLab() {
  const { lang } = useLang();
  const failoverLayers = lang === 'en' ? FAILOVER_LAYERS_EN : FAILOVER_LAYERS;
  const auxTasks = lang === 'en' ? AUX_TASKS_EN : AUX_TASKS;
  const textChain = lang === 'en' ? TEXT_CHAIN_EN : TEXT_CHAIN;
  const visionChain = lang === 'en' ? VISION_CHAIN_EN : VISION_CHAIN;
  const codexCallout = lang === 'en' ? CODEX_CALLOUT_EN : CODEX_CALLOUT;
  const intro = lang === 'en' ? ROUTING_INTRO_EN : ROUTING_INTRO;

  const progress = useProgress();
  const saved = progress.labResults['lab:routing'];
  const [taskId, setTaskId] = useState(
    saved && typeof saved === 'object' && 'task' in saved && typeof saved.task === 'string'
      ? saved.task
      : AUX_TASKS[0].id,
  );

  const task = auxTasks.find((t) => t.id === taskId) ?? auxTasks[0];
  const chain = task.kind === 'vision' ? visionChain : textChain;

  function select(id: string) {
    setTaskId(id);
    setLabResult('lab:routing', { task: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <SectionHeading
        kicker={pick(lang, ROUTING_UI.failoverKicker)}
        title={pick(lang, ROUTING_UI.failoverTitle)}
      />
      <div className="mt-5 space-y-3">
        {failoverLayers.map((l) => (
          <div key={l.id} className="rounded-lg border border-line bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{l.name}</p>
              <p className="font-mono text-xs text-ember">
                {pick(lang, ROUTING_UI.triggerPrefix)}
                {l.trigger}
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{l.body}</p>
            <p className="mt-2 font-mono text-xs text-blue">{l.sourceRef}</p>
          </div>
        ))}
      </div>

      <SectionHeading
        kicker={pick(lang, ROUTING_UI.auxKicker)}
        title={pick(lang, ROUTING_UI.auxTitle)}
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {auxTasks.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
              t.id === task.id
                ? 'border-ink bg-ink text-acid'
                : 'border-line bg-white text-ink/70 hover:border-muted'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg border border-ink/20 bg-code-bg p-5 text-white">
          <p className="font-mono text-[11px] tracking-[0.15em] text-acid">
            {pick(lang, ROUTING_UI.chainPrefix)}
            {task.kind === 'vision'
              ? pick(lang, ROUTING_UI.visionTask)
              : pick(lang, ROUTING_UI.textTask)}
          </p>
          <p className="mt-1 text-xs text-white/55">{task.desc}</p>
          <ol className="mt-4 space-y-2.5">
            {chain.map((c) => (
              <li key={c.step} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${
                    c.backend === 'None' ? 'bg-red/20 text-red' : 'bg-white/10 text-acid'
                  }`}
                >
                  {c.step}
                </span>
                <span>
                  <span className="text-white/90">{c.backend}</span>
                  {c.note && <span className="ml-2 text-xs text-white/50">{c.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          <CodeBlock file="config.yaml" code={AUX_CONFIG_EXAMPLE} />
          <div className="rounded-lg border border-ember/40 bg-ember/5 p-4">
            <p className="font-mono text-sm text-ember">⚠ {codexCallout.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{codexCallout.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
