'use client';

import { useState } from 'react';
import { SELF_ASSESSMENT_TOPICS } from '@/data/interview';
import {
  answeredCount,
  clampLevel,
  completionPercent,
  levelDistribution,
  weakTopicIds,
  type AssessmentLevel,
} from '@/lib/assessment';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

const LEVELS: { level: AssessmentLevel; label: string; desc: string }[] = [
  { level: 1, label: '能讲清', desc: '能向外行讲明白它是什么、为什么存在' },
  { level: 2, label: '能设计', desc: '能复刻它的设计，并讲清关键取舍' },
  { level: 3, label: '能答追问', desc: '经得住追问链：边界、故障、替代方案' },
];

// Chapter 26「自我评估与面试清单」：自评矩阵。
// 行是 12 个主题，列是三档；档位 0–3 持久化到 labResults['lab:interview-checklist'].levels。
// 底部汇总：总进度、按档位分布、薄弱项（档位 <2，附 sourceRef 回链）。
// 聚合逻辑全部在 src/lib/assessment.ts（纯函数，有单测）。
export default function SelfAssessmentLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:interview-checklist'];
  const initialLevels =
    saved &&
    typeof saved === 'object' &&
    'levels' in saved &&
    saved.levels &&
    typeof saved.levels === 'object'
      ? (saved.levels as Record<string, number>)
      : {};
  const [levels, setLevels] = useState<Record<string, number>>(initialLevels);

  const topicIds = SELF_ASSESSMENT_TOPICS.map((t) => t.id);
  const percent = completionPercent(levels, topicIds);
  const dist = levelDistribution(levels, topicIds);
  const answered = answeredCount(levels, topicIds);
  const weakIds = new Set(weakTopicIds(levels, topicIds));
  const weakTopics = SELF_ASSESSMENT_TOPICS.filter((t) => weakIds.has(t.id));

  // 点选档位；再点一次当前档位则清零（撤回自评）
  function select(id: string, level: AssessmentLevel) {
    const current = clampLevel(levels[id]);
    const next = { ...levels, [id]: current === level ? 0 : level };
    setLevels(next);
    setLabResult('lab:interview-checklist', { levels: next });
  }

  return (
    <section className="mt-10">
      <div className="max-w-3xl space-y-4 leading-relaxed text-ink/75">
        <p>
          面试前最后一道手续是诚实的自评。对着下面 12 个主题逐一点选你达到的最高档位：
          <strong className="text-ink">能讲清</strong>（可以说给外行听）、
          <strong className="text-ink">能设计</strong>（能复刻设计并讲清取舍）、
          <strong className="text-ink">能答追问</strong>（经得住边界、故障与替代方案的连环问）。
          再点一次当前档位可以撤回。底部会汇总出你的薄弱项——每一条都附了回链， 面试前把档位 &lt;2
          的主题补齐。
        </p>
      </div>

      {/* 自评矩阵 */}
      <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-normal">主题</th>
              {LEVELS.map((l) => (
                <th key={l.level} className="px-4 py-3 text-center font-normal">
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SELF_ASSESSMENT_TOPICS.map((t) => {
              const current = clampLevel(levels[t.id]);
              const weak = weakIds.has(t.id);
              return (
                <tr
                  key={t.id}
                  className={`border-b border-line/60 last:border-0 ${weak && answered > 0 ? 'bg-ember/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium whitespace-nowrap">
                      {weak && answered > 0 && <span className="mr-1.5 text-ember">◂</span>}
                      {t.topic}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">{t.sourceRef}</p>
                  </td>
                  {LEVELS.map((l) => {
                    const active = current >= l.level && current > 0;
                    const isCurrent = current === l.level;
                    return (
                      <td key={l.level} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => select(t.id, l.level)}
                          title={l.desc}
                          className={`h-7 w-7 rounded-full border font-mono text-xs transition-colors ${
                            isCurrent
                              ? 'border-ink bg-ink text-acid'
                              : active
                                ? 'border-ink/40 bg-ink/10 text-ink/60'
                                : 'border-line text-muted/50 hover:border-muted hover:text-muted'
                          }`}
                        >
                          {l.level}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 汇总 */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted">总进度</p>
              <p className="font-mono text-sm text-muted">
                已评估 {answered}/{SELF_ASSESSMENT_TOPICS.length}
              </p>
            </div>
            <p className="mt-2 font-serif text-4xl">
              {percent}
              <span className="text-lg text-muted">%</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
              <div
                className="h-full rounded-full bg-acid transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">按档位分布</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-ink/75">3 · 能答追问</span>
                <span className="font-mono text-green">{dist[3]}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink/75">2 · 能设计</span>
                <span className="font-mono text-blue">{dist[2]}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink/75">1 · 能讲清</span>
                <span className="font-mono text-ember">{dist[1]}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink/75">0 · 未评估 / 讲不清</span>
                <span className="font-mono text-muted">{dist[0]}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
            薄弱项（档位 &lt;2，{weakTopics.length} 个）
          </p>
          {weakTopics.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-green">
              没有薄弱项——12 个主题全部达到「能设计」以上。去把第 23 章的追问链再过一遍，
              然后放平心态去面试。
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {weakTopics.map((t) => (
                <li key={t.id} className="text-sm">
                  <span className="font-medium text-ink">{t.topic}</span>
                  <span className="ml-2 font-mono text-xs text-muted">
                    当前档位 {clampLevel(levels[t.id])}
                  </span>
                  <p className="mt-0.5 font-mono text-xs text-blue">回炉 → {t.sourceRef}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
