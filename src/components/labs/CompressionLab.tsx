'use client';

import { useState } from 'react';
import {
  CHECKPOINT_FACTS,
  CHECKPOINT_INTRO,
  CHECKPOINT_LAYOUT,
  COMPRESSION_EXTRAS,
  COMPRESSION_INTRO,
  COMPRESSION_STEPS,
} from '@/data/compression';
import { CodeBlock, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 29「上下文压缩与 Checkpoint」：压缩流程步进器 + checkpoint 揭秘。
export default function CompressionLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:compression'];
  const [stepId, setStepId] = useState(
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : COMPRESSION_STEPS[0].id,
  );

  const step = COMPRESSION_STEPS.find((s) => s.id === stepId) ?? COMPRESSION_STEPS[0];

  function select(id: string) {
    setStepId(id);
    setLabResult('lab:compression', { step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{COMPRESSION_INTRO}</p>

      <SectionHeading kicker="压缩流程" title="唯一被允许的上下文变更" />
      <div className="mt-5">
        <Stepper
          steps={COMPRESSION_STEPS.map((s) => ({ id: s.id, label: s.label }))}
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
        {COMPRESSION_EXTRAS.map((e) => (
          <div key={e.title} className="rounded-lg border border-acid bg-acid/10 p-5">
            <p className="font-mono text-sm text-ink">⚡ {e.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{e.body}</p>
          </div>
        ))}
      </div>

      <SectionHeading kicker="隐形搭档" title="Checkpoint：改文件前的快照" />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">{CHECKPOINT_INTRO}</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          {CHECKPOINT_FACTS.map((f) => (
            <div key={f.title} className="rounded-lg border border-line bg-white p-4">
              <p className="font-medium">{f.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{f.body}</p>
            </div>
          ))}
        </div>
        <CodeBlock
          file="tools/checkpoint_manager.py"
          lines="存储布局"
          code={CHECKPOINT_LAYOUT}
          note="单一共享对象库：git 内容寻址跨项目去重；GIT_DIR/GIT_WORK_TREE 隔离，不污染你的 .git"
        />
      </div>
    </section>
  );
}
