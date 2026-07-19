'use client';

import { useState } from 'react';
import { FEATURES, FEATURES_QUIZ, SCENARIOS } from '@/data/features';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import Quiz from '../Quiz';

// Chapter 02「功能全景」：能力矩阵 + 场景选择器 + 测验。
// 选中场景会高亮该场景调动的能力行，场景选择持久化到 labResults。
export default function FeatureMatrixLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:features'];
  const initialScenario =
    saved && typeof saved === 'object' && 'scenario' in saved && typeof saved.scenario === 'string'
      ? saved.scenario
      : null;
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenario);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? null;

  function select(id: string) {
    const next = id === scenarioId ? null : id;
    setScenarioId(next);
    setLabResult('lab:features', { scenario: next });
  }

  return (
    <section className="mt-10">
      <div className="max-w-3xl space-y-4 leading-relaxed text-ink/75">
        <p>
          <strong className="text-ink">Hermes Agent</strong> 是 Nous Research 开发的自进化 AI
          agent，用 Python 实现、开源（MIT）。它是目前唯一内置
          <strong className="text-ink">学习循环</strong>的
          agent：从经验中创建技能、在使用中改进技能、主动持久化知识、搜索自己的历史会话，
          并跨会话逐步建立对你的深度理解。
        </p>
        <p>
          大多数 AI agent 用完即弃、每次从零开始；Hermes 的核心差异在于它会
          <strong className="text-ink">积累</strong>
          。下面这张矩阵是它全部能力的地图——每一行都对应 M1 的一章。
        </p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-normal">能力</th>
              <th className="px-4 py-3 font-normal">说明</th>
              <th className="px-4 py-3 font-normal">源码位置</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => {
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
        <p className="kicker">场景选择器</p>
        <h3 className="mt-2 font-serif text-2xl">你的用法会调动哪些能力？</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
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
              场景拆解 · {scenario.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{scenario.explanation}</p>
            <p className="mt-3 font-mono text-xs text-muted">
              主要调动：
              {scenario.featureIds
                .map((id) => FEATURES.find((f) => f.id === id)?.name)
                .filter(Boolean)
                .join(' / ')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-12 max-w-3xl">
        <Quiz item={FEATURES_QUIZ} />
      </div>
    </section>
  );
}
