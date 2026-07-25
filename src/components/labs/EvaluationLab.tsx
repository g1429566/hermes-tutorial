'use client';

import { useState } from 'react';
import {
  BATCH_STEPS,
  BATCH_STEPS_EN,
  EVAL_ECOSYSTEM,
  EVAL_ECOSYSTEM_EN,
  EVALUATION_INTRO,
  EVALUATION_INTRO_EN,
  EVALUATION_UI,
  SWE_RUNNER,
  SWE_RUNNER_EN,
  TRAJECTORY_FORMAT,
  TRAJECTORY_FORMAT_EN,
} from '@/data/evaluation';
import { CodeBlock, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 32「批处理与 Agent 评测」：批量流水线步进器 + 轨迹格式 + 评测生态。
export default function EvaluationLab() {
  const { lang } = useLang();
  const batchSteps = lang === 'en' ? BATCH_STEPS_EN : BATCH_STEPS;
  const sweRunner = lang === 'en' ? SWE_RUNNER_EN : SWE_RUNNER;
  const trajectoryFormat = lang === 'en' ? TRAJECTORY_FORMAT_EN : TRAJECTORY_FORMAT;
  const ecosystem = lang === 'en' ? EVAL_ECOSYSTEM_EN : EVAL_ECOSYSTEM;
  const intro = lang === 'en' ? EVALUATION_INTRO_EN : EVALUATION_INTRO;

  const progress = useProgress();
  const saved = progress.labResults['lab:evaluation'];
  const [stepId, setStepId] = useState(
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : BATCH_STEPS[0].id,
  );

  const step = batchSteps.find((s) => s.id === stepId) ?? batchSteps[0];

  function select(id: string) {
    setStepId(id);
    setLabResult('lab:evaluation', { step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <SectionHeading
        kicker={pick(lang, EVALUATION_UI.pipelineKicker)}
        title={pick(lang, EVALUATION_UI.pipelineTitle)}
      />
      <div className="mt-5">
        <Stepper
          steps={batchSteps.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={select}
        />
        <div className="mt-4 max-w-3xl rounded-lg border border-line bg-white p-5">
          <h4 className="font-serif text-xl">{step.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{step.body}</p>
        </div>
      </div>

      <SectionHeading
        kicker={pick(lang, EVALUATION_UI.trajectoryKicker)}
        title={pick(lang, EVALUATION_UI.trajectoryTitle)}
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CodeBlock file="trajectory.jsonl" code={trajectoryFormat} />
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-medium">{sweRunner.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{sweRunner.body}</p>
          <ul className="mt-4 space-y-2">
            {sweRunner.commands.map((c) => (
              <li key={c}>
                <code className="block overflow-x-auto rounded bg-code-bg px-3 py-2 font-mono text-xs text-acid">
                  {c}
                </code>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionHeading
        kicker={pick(lang, EVALUATION_UI.ecosystemKicker)}
        title={pick(lang, EVALUATION_UI.ecosystemTitle)}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ecosystem.map((e) => (
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
