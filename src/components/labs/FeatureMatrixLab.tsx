'use client';

import { useState } from 'react';
import {
  FEATURES,
  FEATURES_EN,
  FEATURES_QUIZ,
  FEATURES_QUIZ_EN,
  FEATURES_UI,
  SCENARIOS,
  SCENARIOS_EN,
} from '@/data/features';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';
import Quiz from '../Quiz';

// Chapter 02「功能全景」：能力矩阵 + 场景选择器 + 测验。
// 选中场景会高亮该场景调动的能力行，场景选择持久化到 labResults。
export default function FeatureMatrixLab() {
  const { lang } = useLang();
  const features = lang === 'en' ? FEATURES_EN : FEATURES;
  const scenarios = lang === 'en' ? SCENARIOS_EN : SCENARIOS;
  const quiz = lang === 'en' ? FEATURES_QUIZ_EN : FEATURES_QUIZ;
  const progress = useProgress();
  const saved = progress.labResults['lab:features'];
  const initialScenario =
    saved && typeof saved === 'object' && 'scenario' in saved && typeof saved.scenario === 'string'
      ? saved.scenario
      : null;
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenario);

  const scenario = scenarios.find((s) => s.id === scenarioId) ?? null;

  function select(id: string) {
    const next = id === scenarioId ? null : id;
    setScenarioId(next);
    setLabResult('lab:features', { scenario: next });
  }

  return (
    <section className="mt-10">
      <div className="max-w-3xl space-y-4 leading-relaxed text-ink/75">
        <p>
          {pick(lang, FEATURES_UI.introP1).map((seg, i) =>
            seg.strong ? (
              <strong key={i} className="text-ink">
                {seg.text}
              </strong>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
        <p>
          {pick(lang, FEATURES_UI.introP2).map((seg, i) =>
            seg.strong ? (
              <strong key={i} className="text-ink">
                {seg.text}
              </strong>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-normal">{pick(lang, FEATURES_UI.thCapability)}</th>
              <th className="px-4 py-3 font-normal">{pick(lang, FEATURES_UI.thDesc)}</th>
              <th className="px-4 py-3 font-normal">{pick(lang, FEATURES_UI.thSource)}</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => {
              const active = scenario?.featureIds.includes(f.id) ?? false;
              return (
                <tr
                  key={f.id}
                  className={`border-b border-line/60 last:border-0 transition-colors ${
                    active ? 'bg-acid/15' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {active && <span className="mr-1.5 text-ember">◂</span>}
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-ink/75">{f.desc}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue">{f.sourceRef}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-12">
        <p className="kicker">{pick(lang, FEATURES_UI.scenarioKicker)}</p>
        <h3 className="mt-2 font-serif text-2xl">{pick(lang, FEATURES_UI.scenarioTitle)}</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => select(s.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                s.id === scenarioId
                  ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-ember)]'
                  : 'border-line bg-white hover:border-muted'
              }`}
            >
              <p className="font-medium">{s.title}</p>
              <p className={`mt-1 text-sm ${s.id === scenarioId ? 'text-white/65' : 'text-muted'}`}>
                {s.description}
              </p>
            </button>
          ))}
        </div>
        {scenario && (
          <div className="mt-4 rounded-lg border border-ember/40 bg-ember/5 p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
              {pick(lang, FEATURES_UI.scenarioBreakdown)} · {scenario.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{scenario.explanation}</p>
            <p className="mt-3 font-mono text-xs text-muted">
              {pick(lang, FEATURES_UI.mainlyUses)}
              {scenario.featureIds
                .map((id) => features.find((f) => f.id === id)?.name)
                .filter(Boolean)
                .join(' / ')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-12 max-w-3xl">
        <Quiz item={quiz} />
      </div>
    </section>
  );
}
