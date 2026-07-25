'use client';

import { useState } from 'react';
import {
  AGENT_DESIGN_INTRO,
  AGENT_DESIGN_INTRO_EN,
  AGENT_DESIGN_UI,
  DESIGN_DIMENSIONS,
  DESIGN_DIMENSIONS_EN,
} from '@/data/agent-design';
import { SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 22「从零设计一个新 Agent」：Agent 设计工作台。
// 五个维度各选一项，右侧设计卡实时累成设计文档；选择持久化到 labResults。
export default function AgentDesignLab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? AGENT_DESIGN_INTRO_EN : AGENT_DESIGN_INTRO;
  const dimensions = lang === 'en' ? DESIGN_DIMENSIONS_EN : DESIGN_DIMENSIONS;
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

  const chosenCount = dimensions.filter((d) => choices[d.id]).length;

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {dimensions.map((dim) => (
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
                            {pick(lang, AGENT_DESIGN_UI.hermesChoiceBadge)}
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
              DESIGN CARD · {chosenCount}/{dimensions.length}
            </p>
            <h3 className="mt-2 font-serif text-2xl">{pick(lang, AGENT_DESIGN_UI.cardTitle)}</h3>
            {chosenCount === 0 && (
              <p className="mt-4 text-sm text-white/55">{pick(lang, AGENT_DESIGN_UI.cardEmpty)}</p>
            )}
            <ul className="mt-4 space-y-4">
              {dimensions
                .filter((d) => choices[d.id])
                .map((d) => {
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
            {chosenCount === dimensions.length && (
              <p className="mt-5 rounded border border-acid/50 bg-acid/10 p-3 text-xs leading-relaxed text-acid">
                {pick(lang, AGENT_DESIGN_UI.cardComplete)}
              </p>
            )}
          </div>
        </div>
      </div>

      <SectionHeading
        kicker={pick(lang, AGENT_DESIGN_UI.closingKicker)}
        title={pick(lang, AGENT_DESIGN_UI.closingTitle)}
      />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        {pick(lang, AGENT_DESIGN_UI.closingBody)}
      </p>
    </section>
  );
}
