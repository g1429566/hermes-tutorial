'use client';

import { useState } from 'react';
import { AGENT_DESIGN_INTRO, DESIGN_DIMENSIONS } from '@/data/agent-design';
import { SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 22「从零设计一个新 Agent」：Agent 设计工作台。
// 五个维度各选一项，右侧设计卡实时累成设计文档；选择持久化到 labResults。
export default function AgentDesignLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:agent-design'];
  const [choices, setChoices] = useState<Record<string, string>>(() => {
    if (saved && typeof saved === 'object' && 'choices' in saved) {
      const c = (saved as { choices?: unknown }).choices;
      if (c && typeof c === 'object') {
        return Object.fromEntries(
          Object.entries(c as Record<string, unknown>).filter(
            (e): e is [string, string] => typeof e[1] === 'string',
          ),
        );
      }
    }
    return {};
  });

  function choose(dimensionId: string, optionId: string) {
    const next = { ...choices, [dimensionId]: optionId };
    setChoices(next);
    setLabResult('lab:agent-design', { choices: next });
  }

  const chosenCount = DESIGN_DIMENSIONS.filter((d) => choices[d.id]).length;

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{AGENT_DESIGN_INTRO}</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {DESIGN_DIMENSIONS.map((dim) => (
            <div key={dim.id}>
              <div className="flex items-baseline gap-3">
                <h3 className="font-serif text-xl">{dim.title}</h3>
                <p className="font-mono text-xs text-muted">{dim.question}</p>
                {choices[dim.id] && <span className="font-mono text-xs text-acid">✓</span>}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dim.options.map((opt) => {
                  const active = choices[dim.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => choose(dim.id, opt.id)}
                      className={`rounded-lg border p-3.5 text-left transition-colors ${
                        active
                          ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-acid)]'
                          : 'border-line bg-white hover:border-muted'
                      }`}
                    >
                      <p className={`text-sm font-medium ${active ? 'text-acid' : ''}`}>
                        {opt.name}
                        {opt.hermesChoice && (
                          <span
                            className={`ml-1.5 font-mono text-[10px] ${
                              active ? 'text-white/50' : 'text-muted'
                            }`}
                          >
                            ◆ Hermes 之选
                          </span>
                        )}
                      </p>
                      <p
                        className={`mt-1 text-xs leading-relaxed ${
                          active ? 'text-white/70' : 'text-muted'
                        }`}
                      >
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-lg border border-ink/20 bg-code-bg p-6 text-white">
            <p className="font-mono text-[11px] tracking-[0.15em] text-acid">
              DESIGN CARD · {chosenCount}/{DESIGN_DIMENSIONS.length}
            </p>
            <h3 className="mt-2 font-serif text-2xl">我的 Agent 设计</h3>
            {chosenCount === 0 && (
              <p className="mt-4 text-sm text-white/55">
                在左侧做出设计选择，这张卡会实时累成你的 agent 设计文档。
              </p>
            )}
            <ul className="mt-4 space-y-4">
              {DESIGN_DIMENSIONS.filter((d) => choices[d.id]).map((d) => {
                const opt = d.options.find((o) => o.id === choices[d.id])!;
                return (
                  <li key={d.id}>
                    <p className="font-mono text-xs text-white/50">
                      {d.title} → <span className="text-acid">{opt.name}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{opt.tradeoff}</p>
                  </li>
                );
              })}
            </ul>
            {chosenCount === DESIGN_DIMENSIONS.length && (
              <p className="mt-5 rounded border border-acid/50 bg-acid/10 p-3 text-xs leading-relaxed text-acid">
                ✓ 五个维度都有决断了——这就是一份最小可行的 agent 设计文档。回到 M1 对照每个决策在
                Hermes 里的实现，你就拥有了面试系统设计题的全套素材。
              </p>
            )}
          </div>
        </div>
      </div>

      <SectionHeading kicker="收束" title="设计即权衡" />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        注意「◆ Hermes 之选」并不是唯一正确答案：本地 CLI
        部署对单人工具完全合理，静态技能库对合规场景更合适。 面试中加分项从来不是背出 Hermes
        的答案，而是说清每个维度的候选、代价与触发条件——这张设计卡就是你的答题骨架。
      </p>
    </section>
  );
}
