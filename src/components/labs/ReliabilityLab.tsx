'use client';

import { useState } from 'react';
import {
  DEFENSE_LAYERS,
  DEFENSE_LAYERS_EN,
  DEFENSE_OPTIONS,
  DEFENSE_OPTIONS_EN,
  DEFENSE_OPTIONS_INTRO,
  DEFENSE_OPTIONS_INTRO_EN,
  FAILURE_MODES,
  FAILURE_MODES_EN,
  RELIABILITY_INTRO,
  RELIABILITY_INTRO_EN,
  RELIABILITY_UI,
} from '@/data/reliability';
import { CompareSelect, DetailPanel, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 27「可靠性设计」：故障注入实验室。
// 上：六种故障注入卡（CompareSelect）→ 详情面板（现象 / 真实应对 / 机制清单 / 防线归属）；
// 中：「重试→熔断→补偿→审计」四层防线条，高亮当前故障的主层；
// 下：「设计你自己的防线」checkbox 组。选中状态持久化到 labResults。
export default function ReliabilityLab() {
  const { lang } = useLang();
  const layers = lang === 'en' ? DEFENSE_LAYERS_EN : DEFENSE_LAYERS;
  const failureModes = lang === 'en' ? FAILURE_MODES_EN : FAILURE_MODES;
  const optionsIntro = lang === 'en' ? DEFENSE_OPTIONS_INTRO_EN : DEFENSE_OPTIONS_INTRO;
  const defenseOptions = lang === 'en' ? DEFENSE_OPTIONS_EN : DEFENSE_OPTIONS;
  const intro = lang === 'en' ? RELIABILITY_INTRO_EN : RELIABILITY_INTRO;

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

  const failure = failureModes.find((f) => f.id === failureId) ?? failureModes[0];
  const failureIdx = failureModes.findIndex((f) => f.id === failure.id);
  const activeLayer = layers.find((l) => l.id === failure.layer) ?? layers[0];

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
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <div className="mt-8">
        <CompareSelect
          options={failureModes.map((f) => ({ id: f.id, name: f.name, tagline: f.tagline }))}
          current={failure.id}
          onChange={selectFailure}
          accent="ember"
        >
          <DetailPanel kicker={`FAULT INJECTION · ${failureIdx + 1}/6`} title={failure.name}>
            <h4 className="mt-6 font-mono text-xs tracking-[0.15em] text-white/50">
              {pick(lang, RELIABILITY_UI.symptom)}
            </h4>
            <p className="mt-2 leading-relaxed text-white/75">{failure.symptom}</p>

            <h4 className="mt-6 font-mono text-xs tracking-[0.15em] text-white/50">
              {pick(lang, RELIABILITY_UI.response)}
            </h4>
            <p className="mt-2 leading-relaxed text-white/75">{failure.response}</p>

            <h4 className="mt-6 font-mono text-xs tracking-[0.15em] text-white/50">
              {pick(lang, RELIABILITY_UI.mechanisms)}
            </h4>
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
                {pick(lang, RELIABILITY_UI.layerPrefix)}
                {activeLayer.label}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/75">{failure.layerNote}</p>
            </div>

            <p className="mt-5 border-t border-white/10 pt-3 font-mono text-xs text-white/45">
              {pick(lang, RELIABILITY_UI.sourcePrefix)}
              {failure.source}
            </p>
          </DetailPanel>
        </CompareSelect>
      </div>

      <SectionHeading
        kicker={pick(lang, RELIABILITY_UI.layersKicker)}
        title={pick(lang, RELIABILITY_UI.layersTitle)}
      />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        {pick(lang, RELIABILITY_UI.layersBody)}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {layers.map((layer, i) => {
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

      <SectionHeading
        kicker={pick(lang, RELIABILITY_UI.handsOnKicker)}
        title={pick(lang, RELIABILITY_UI.handsOnTitle)}
      />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">{optionsIntro}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {defenseOptions.map((opt) => {
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
        {pick(lang, RELIABILITY_UI.countText)
          .replace('{n}', String(defenses.length))
          .replace('{total}', String(defenseOptions.length))}
      </p>
    </section>
  );
}
