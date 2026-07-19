'use client';

import { useState } from 'react';
import {
  DEFENSE_LAYERS,
  DEFENSE_OPTIONS,
  DEFENSE_OPTIONS_INTRO,
  FAILURE_MODES,
  RELIABILITY_INTRO,
} from '@/data/reliability';
import { CompareSelect, DetailPanel, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 27「可靠性设计」：故障注入实验室。
// 上：六种故障注入卡（CompareSelect）→ 详情面板（现象 / 真实应对 / 机制清单 / 防线归属）；
// 中：「重试→熔断→补偿→审计」四层防线条，高亮当前故障的主层；
// 下：「设计你自己的防线」checkbox 组。选中状态持久化到 labResults。
export default function ReliabilityLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:reliability'];
  const restored = saved && typeof saved === 'object' ? saved : null;
  const initialFailure =
    restored && 'failure' in restored && typeof restored.failure === 'string'
      ? restored.failure
      : FAILURE_MODES[0].id;
  const initialDefenses =
    restored && 'defenses' in restored && Array.isArray(restored.defenses)
      ? restored.defenses.filter((d): d is string => typeof d === 'string')
      : [];

  const [failureId, setFailureId] = useState(initialFailure);
  const [defenses, setDefenses] = useState<string[]>(initialDefenses);

  const failure = FAILURE_MODES.find((f) => f.id === failureId) ?? FAILURE_MODES[0];
  const failureIdx = FAILURE_MODES.findIndex((f) => f.id === failure.id);
  const activeLayer = DEFENSE_LAYERS.find((l) => l.id === failure.layer) ?? DEFENSE_LAYERS[0];

  function persist(nextFailure: string, nextDefenses: string[]) {
    setLabResult('lab:reliability', { failure: nextFailure, defenses: nextDefenses });
  }

  function selectFailure(id: string) {
    setFailureId(id);
    persist(id, defenses);
  }

  function toggleDefense(id: string) {
    const next = defenses.includes(id) ? defenses.filter((d) => d !== id) : [...defenses, id];
    setDefenses(next);
    persist(failureId, next);
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{RELIABILITY_INTRO}</p>

      <div className="mt-8">
        <CompareSelect
          options={FAILURE_MODES.map((f) => ({ id: f.id, name: f.name, tagline: f.tagline }))}
          current={failure.id}
          onChange={selectFailure}
          accent="ember"
        >
          <DetailPanel kicker={`FAULT INJECTION · ${failureIdx + 1}/6`} title={failure.name}>
            <h4 className="mt-6 font-mono text-xs tracking-[0.15em] text-white/50">故障现象</h4>
            <p className="mt-2 leading-relaxed text-white/75">{failure.symptom}</p>

            <h4 className="mt-6 font-mono text-xs tracking-[0.15em] text-white/50">
              Hermes 的真实应对
            </h4>
            <p className="mt-2 leading-relaxed text-white/75">{failure.response}</p>

            <h4 className="mt-6 font-mono text-xs tracking-[0.15em] text-white/50">机制与源码</h4>
            <ul className="mt-2.5 space-y-2">
              {failure.mechanisms.map((m) => (
                <li key={m.name} className="text-sm">
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-ember">
                    {m.name}
                  </code>
                  <span className="ml-2 text-white/65">{m.desc}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-lg border border-acid/40 bg-acid/10 p-4">
              <p className="font-mono text-[11px] tracking-[0.15em] text-acid">
                防线归属 · {activeLayer.label}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/75">{failure.layerNote}</p>
            </div>

            <p className="mt-5 border-t border-white/10 pt-3 font-mono text-xs text-white/45">
              源码位置：{failure.source}
            </p>
          </DetailPanel>
        </CompareSelect>
      </div>

      <SectionHeading kicker="四层防线" title="重试 → 熔断 → 补偿 → 审计" />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        四层防线按「故障发生前 → 故障扩散前 → 故障发生后 →
        全程留痕」排列。当前选中的故障主层已高亮——注意「重试」与「审计」没有专属故障卡：重试在
        Hermes 里更多是模型看到错误结果后的自发行为，审计则默认贯穿每一次循环。
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DEFENSE_LAYERS.map((layer, i) => {
          const active = layer.id === failure.layer;
          return (
            <div
              key={layer.id}
              className={`rounded-lg border p-4 transition-colors ${
                active
                  ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-ember)]'
                  : 'border-line bg-white'
              }`}
            >
              <p
                className={`font-mono text-[11px] tracking-[0.15em] ${
                  active ? 'text-ember' : 'text-muted'
                }`}
              >
                LAYER {i + 1}
              </p>
              <p className={`mt-1 font-serif text-xl ${active ? 'text-acid' : ''}`}>
                {layer.label}
              </p>
              <p
                className={`mt-2 text-sm leading-relaxed ${active ? 'text-white/70' : 'text-muted'}`}
              >
                {layer.desc}
              </p>
            </div>
          );
        })}
      </div>

      <SectionHeading kicker="动手" title="设计你自己的防线" />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">{DEFENSE_OPTIONS_INTRO}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {DEFENSE_OPTIONS.map((opt) => {
          const checked = defenses.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleDefense(opt.id)}
              aria-pressed={checked}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                checked ? 'border-ink bg-paper-deep' : 'border-line bg-white hover:border-muted'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-xs ${
                  checked ? 'border-ink bg-acid text-ink' : 'border-line bg-white text-transparent'
                }`}
              >
                ✓
              </span>
              <span>
                <span className="font-medium">{opt.name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {opt.tradeoff}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 font-mono text-xs text-muted">
        已选 {defenses.length}/{DEFENSE_OPTIONS.length} 道防线 · 选择已保存到本地进度
      </p>
    </section>
  );
}
