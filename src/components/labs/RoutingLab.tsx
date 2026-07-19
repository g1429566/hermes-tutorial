'use client';

import { useState } from 'react';
import {
  AUX_CONFIG_EXAMPLE,
  AUX_TASKS,
  CODEX_CALLOUT,
  FAILOVER_LAYERS,
  ROUTING_INTRO,
  TEXT_CHAIN,
  VISION_CHAIN,
} from '@/data/routing';
import { CodeBlock, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 30「模型路由与凭据池」：三层降级 + 辅助任务解析链。
export default function RoutingLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:routing'];
  const [taskId, setTaskId] = useState(
    saved && typeof saved === 'object' && 'task' in saved && typeof saved.task === 'string'
      ? saved.task
      : AUX_TASKS[0].id,
  );

  const task = AUX_TASKS.find((t) => t.id === taskId) ?? AUX_TASKS[0];
  const chain = task.kind === 'vision' ? VISION_CHAIN : TEXT_CHAIN;

  function select(id: string) {
    setTaskId(id);
    setLabResult('lab:routing', { task: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{ROUTING_INTRO}</p>

      <SectionHeading kicker="三层降级" title="主模型挂了，谁来接盘" />
      <div className="mt-5 space-y-3">
        {FAILOVER_LAYERS.map((l) => (
          <div key={l.id} className="rounded-lg border border-line bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{l.name}</p>
              <p className="font-mono text-xs text-ember">触发：{l.trigger}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{l.body}</p>
            <p className="mt-2 font-mono text-xs text-blue">{l.sourceRef}</p>
          </div>
        ))}
      </div>

      <SectionHeading kicker="辅助任务路由" title="侧边 LLM 调用派给谁" />
      <div className="mt-5 flex flex-wrap gap-2">
        {AUX_TASKS.map((t) => (
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
            AUTO 解析链 · {task.kind === 'vision' ? '视觉任务' : '文本任务'}
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
            <p className="font-mono text-sm text-ember">⚠ {CODEX_CALLOUT.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{CODEX_CALLOUT.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
