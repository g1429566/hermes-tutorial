'use client';

import { useState } from 'react';
import {
  BATCH_STEPS,
  EVAL_ECOSYSTEM,
  EVALUATION_INTRO,
  SWE_RUNNER,
  TRAJECTORY_FORMAT,
} from '@/data/evaluation';
import { CodeBlock, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 32「批处理与 Agent 评测」：批量流水线步进器 + 轨迹格式 + 评测生态。
export default function EvaluationLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:evaluation'];
  const [stepId, setStepId] = useState(
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : BATCH_STEPS[0].id,
  );

  const step = BATCH_STEPS.find((s) => s.id === stepId) ?? BATCH_STEPS[0];

  function select(id: string) {
    setStepId(id);
    setLabResult('lab:evaluation', { step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{EVALUATION_INTRO}</p>

      <SectionHeading kicker="批量流水线" title="batch_runner 的五步" />
      <div className="mt-5">
        <Stepper
          steps={BATCH_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={select}
        />
        <div className="mt-4 max-w-3xl rounded-lg border border-line bg-white p-5">
          <h4 className="font-serif text-xl">{step.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{step.body}</p>
        </div>
      </div>

      <SectionHeading kicker="轨迹格式" title="评测与训练共用的数据形状" />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CodeBlock file="trajectory.jsonl" code={TRAJECTORY_FORMAT} />
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-medium">{SWE_RUNNER.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{SWE_RUNNER.body}</p>
          <ul className="mt-4 space-y-2">
            {SWE_RUNNER.commands.map((c) => (
              <li key={c}>
                <code className="block overflow-x-auto rounded bg-code-bg px-3 py-2 font-mono text-xs text-acid">
                  {c}
                </code>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionHeading kicker="评测生态" title="同一份轨迹，整条管道" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EVAL_ECOSYSTEM.map((e) => (
          <div key={e.name} className="rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-sm text-ember">{e.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{e.desc}</p>
            <p className="mt-2 font-mono text-xs text-blue">{e.sourceRef}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
