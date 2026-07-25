'use client';

import { useState } from 'react';
import {
  CHECKPOINT_FACTS,
  CHECKPOINT_FACTS_EN,
  CHECKPOINT_INTRO,
  CHECKPOINT_INTRO_EN,
  CHECKPOINT_LAYOUT,
  COMPRESSION_EXTRAS,
  COMPRESSION_EXTRAS_EN,
  COMPRESSION_INTRO,
  COMPRESSION_INTRO_EN,
  COMPRESSION_STEPS,
  COMPRESSION_STEPS_EN,
  COMPRESSION_UI,
} from '@/data/compression';
import { CodeBlock, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 29「上下文压缩与 Checkpoint」：压缩流程步进器 + checkpoint 揭秘。
export default function CompressionLab() {
  const { lang } = useLang();
  const steps = lang === 'en' ? COMPRESSION_STEPS_EN : COMPRESSION_STEPS;
  const extras = lang === 'en' ? COMPRESSION_EXTRAS_EN : COMPRESSION_EXTRAS;
  const intro = lang === 'en' ? COMPRESSION_INTRO_EN : COMPRESSION_INTRO;
  const checkpointIntro = lang === 'en' ? CHECKPOINT_INTRO_EN : CHECKPOINT_INTRO;
  const checkpointFacts = lang === 'en' ? CHECKPOINT_FACTS_EN : CHECKPOINT_FACTS;

  const progress = useProgress();
  const saved = progress.labResults['lab:compression'];
  const [stepId, setStepId] = useState(
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : COMPRESSION_STEPS[0].id,
  );

  const step = steps.find((s) => s.id === stepId) ?? steps[0];

  function select(id: string) {
    setStepId(id);
    setLabResult('lab:compression', { step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <SectionHeading
        kicker={pick(lang, COMPRESSION_UI.stepsKicker)}
        title={pick(lang, COMPRESSION_UI.stepsTitle)}
      />
      <div className="mt-5">
        <Stepper
          steps={steps.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={select}
        />
        <div className="mt-4 max-w-3xl rounded-lg border border-line bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h4 className="font-serif text-xl">{step.title}</h4>
            <code className="font-mono text-xs text-blue">{step.sourceRef}</code>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{step.body}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {extras.map((e) => (
          <div key={e.title} className="rounded-lg border border-acid bg-acid/10 p-5">
            <p className="font-mono text-sm text-ink">⚡ {e.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{e.body}</p>
          </div>
        ))}
      </div>

      <SectionHeading
        kicker={pick(lang, COMPRESSION_UI.checkpointKicker)}
        title={pick(lang, COMPRESSION_UI.checkpointTitle)}
      />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">{checkpointIntro}</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          {checkpointFacts.map((f) => (
            <div key={f.title} className="rounded-lg border border-line bg-white p-4">
              <p className="font-medium">{f.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{f.body}</p>
            </div>
          ))}
        </div>
        <CodeBlock
          file="tools/checkpoint_manager.py"
          lines={pick(lang, COMPRESSION_UI.layoutLines)}
          code={CHECKPOINT_LAYOUT}
          note={pick(lang, COMPRESSION_UI.layoutNote)}
        />
      </div>
    </section>
  );
}
