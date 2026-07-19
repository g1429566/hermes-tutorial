'use client';

import { useState } from 'react';
import { TOPOLOGIES, TOPOLOGY_INTRO, TOPOLOGY_SCENARIOS } from '@/data/topologies';
import { CompareSelect, DetailPanel, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 24「多 Agent 协作设计题」：拓扑选择器 + 场景题。
// CompareSelect 对比五种拓扑（DetailPanel 展示六维详情 + Hermes 对应物）；
// 场景题让用户先选拓扑再揭示推荐答案。选择与作答持久化到 labResults['lab:interview-topology']。
export default function TopologyLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:interview-topology'];
  const savedTopology =
    saved && typeof saved === 'object' && 'topology' in saved && typeof saved.topology === 'string'
      ? saved.topology
      : TOPOLOGIES[0].id;
  const savedScenarios =
    saved &&
    typeof saved === 'object' &&
    'scenarios' in saved &&
    saved.scenarios &&
    typeof saved.scenarios === 'object'
      ? (saved.scenarios as Record<string, string>)
      : {};
  const [topologyId, setTopologyId] = useState(savedTopology);
  const [answers, setAnswers] = useState<Record<string, string>>(savedScenarios);

  const topology = TOPOLOGIES.find((t) => t.id === topologyId) ?? TOPOLOGIES[0];

  function selectTopology(id: string) {
    setTopologyId(id);
    setLabResult('lab:interview-topology', { topology: id, scenarios: answers });
  }

  function answerScenario(scenarioId: string, choice: string) {
    const next = { ...answers, [scenarioId]: choice };
    setAnswers(next);
    setLabResult('lab:interview-topology', { topology: topologyId, scenarios: next });
  }

  const rows: { label: string; value: string }[] = [
    { label: '结构', value: topology.structure },
    { label: '任务分发', value: topology.dispatch },
    { label: '上下文共享', value: topology.contextSharing },
    { label: '故障隔离', value: topology.faultIsolation },
    { label: '适用场景', value: topology.useCases },
  ];

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{TOPOLOGY_INTRO}</p>

      <div className="mt-8">
        <CompareSelect
          options={TOPOLOGIES.map((t) => ({ id: t.id, name: t.name, tagline: t.tagline }))}
          current={topology.id}
          onChange={selectTopology}
        >
          <DetailPanel kicker="TOPOLOGY" title={topology.name}>
            <dl className="mt-6 space-y-4">
              {rows.map((r) => (
                <div key={r.label} className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-4">
                  <dt className="font-mono text-[11px] tracking-[0.15em] text-ember sm:pt-0.5">
                    {r.label}
                  </dt>
                  <dd className="text-sm leading-relaxed text-white/80">{r.value}</dd>
                </div>
              ))}
              <div className="border-t border-white/10 pt-4">
                <div className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-4">
                  <dt className="font-mono text-[11px] tracking-[0.15em] text-acid sm:pt-0.5">
                    HERMES
                  </dt>
                  <dd className="text-sm leading-relaxed text-white/80">{topology.hermes}</dd>
                </div>
              </div>
            </dl>
          </DetailPanel>
        </CompareSelect>
      </div>

      <SectionHeading kicker="场景题" title="轮到你了：为场景选拓扑" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/75">
        先读场景，点选你认为最合适的拓扑——选完立即揭示推荐答案与理由。没有唯一正确的拓扑，
        但每个场景都有「最省力」的那个。
      </p>

      <div className="mt-6 space-y-5">
        {TOPOLOGY_SCENARIOS.map((s) => {
          const choice = answers[s.id] ?? null;
          const recommended = TOPOLOGIES.find((t) => t.id === s.recommended);
          return (
            <div key={s.id} className="rounded-lg border border-line bg-white p-6">
              <h4 className="font-serif text-xl">{s.title}</h4>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/75">{s.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {TOPOLOGIES.map((t) => {
                  const active = choice === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => answerScenario(s.id, t.id)}
                      className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
                        active
                          ? 'border-ink bg-ink text-acid'
                          : 'border-line bg-white text-ink/70 hover:border-muted'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
              {choice && recommended && (
                <div
                  className={`mt-4 rounded-lg border p-5 ${
                    choice === s.recommended
                      ? 'border-acid bg-acid/10'
                      : 'border-ember/40 bg-ember/5'
                  }`}
                >
                  <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
                    {choice === s.recommended ? '✓ 与推荐一致' : '推荐拓扑'} · {recommended.name}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/80">{s.reasoning}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
