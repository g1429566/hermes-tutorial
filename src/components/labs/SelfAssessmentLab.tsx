'use client';

import { useState } from 'react';
import {
  SELF_ASSESSMENT_LEVELS,
  SELF_ASSESSMENT_TOPICS,
  SELF_ASSESSMENT_TOPICS_EN,
  SELF_ASSESSMENT_UI,
} from '@/data/interview';
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
import { useLang, pick } from '@/lib/i18n';

// Chapter 26「自我评估与面试清单」：自评矩阵。
// 行是 12 个主题，列是三档；档位 0–3 持久化到 labResults['lab:interview-checklist'].levels。
// 底部汇总：总进度、按档位分布、薄弱项（档位 <2，附 sourceRef 回链）。
// 聚合逻辑全部在 src/lib/assessment.ts（纯函数，有单测）。
export default function SelfAssessmentLab() {
  const { lang } = useLang();
  const topics = lang === 'en' ? SELF_ASSESSMENT_TOPICS_EN : SELF_ASSESSMENT_TOPICS;
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

  const topicIds = topics.map((t) => t.id);
  const percent = completionPercent(levels, topicIds);
  const dist = levelDistribution(levels, topicIds);
  const answered = answeredCount(levels, topicIds);
  const weakIds = new Set(weakTopicIds(levels, topicIds));
  const weakTopics = topics.filter((t) => weakIds.has(t.id));

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
          {pick(lang, SELF_ASSESSMENT_UI.introLead)}
          <strong className="text-ink">{pick(lang, SELF_ASSESSMENT_LEVELS[0].label)}</strong>
          {pick(lang, SELF_ASSESSMENT_UI.introHint1)}
          {lang === 'zh' ? '、' : ', '}
          <strong className="text-ink">{pick(lang, SELF_ASSESSMENT_LEVELS[1].label)}</strong>
          {pick(lang, SELF_ASSESSMENT_UI.introHint2)}
          {lang === 'zh' ? '、' : ', '}
          <strong className="text-ink">{pick(lang, SELF_ASSESSMENT_LEVELS[2].label)}</strong>
          {pick(lang, SELF_ASSESSMENT_UI.introHint3)}
          {lang === 'zh' ? '。' : '. '}
          {pick(lang, SELF_ASSESSMENT_UI.introTail)}
        </p>
      </div>

      {/* 自评矩阵 */}
      <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-normal">
                {pick(lang, SELF_ASSESSMENT_UI.topicHeader)}
              </th>
              {SELF_ASSESSMENT_LEVELS.map((l) => (
                <th key={l.level} className="px-4 py-3 text-center font-normal">
                  {pick(lang, l.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => {
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
                  {SELF_ASSESSMENT_LEVELS.map((l) => {
                    const active = current >= l.level && current > 0;
                    const isCurrent = current === l.level;
                    return (
                      <td key={l.level} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => select(t.id, l.level)}
                          title={pick(lang, l.desc)}
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
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
                {pick(lang, SELF_ASSESSMENT_UI.overallProgress)}
              </p>
              <p className="font-mono text-sm text-muted">
                {pick(lang, SELF_ASSESSMENT_UI.evaluated)} {answered}/{topics.length}
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
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
              {pick(lang, SELF_ASSESSMENT_UI.distByLevel)}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-ink/75">
                  3 · {pick(lang, SELF_ASSESSMENT_LEVELS[2].label)}
                </span>
                <span className="font-mono text-green">{dist[3]}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink/75">
                  2 · {pick(lang, SELF_ASSESSMENT_LEVELS[1].label)}
                </span>
                <span className="font-mono text-blue">{dist[2]}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink/75">
                  1 · {pick(lang, SELF_ASSESSMENT_LEVELS[0].label)}
                </span>
                <span className="font-mono text-ember">{dist[1]}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink/75">{pick(lang, SELF_ASSESSMENT_UI.level0Name)}</span>
                <span className="font-mono text-muted">{dist[0]}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
            {pick(lang, SELF_ASSESSMENT_UI.weakTitlePrefix)}
            {weakTopics.length}
            {pick(lang, SELF_ASSESSMENT_UI.weakTitleSuffix)}
          </p>
          {weakTopics.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-green">
              {pick(lang, SELF_ASSESSMENT_UI.noWeak)}
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {weakTopics.map((t) => (
                <li key={t.id} className="text-sm">
                  <span className="font-medium text-ink">{t.topic}</span>
                  <span className="ml-2 font-mono text-xs text-muted">
                    {pick(lang, SELF_ASSESSMENT_UI.currentLevel)} {clampLevel(levels[t.id])}
                  </span>
                  <p className="mt-0.5 font-mono text-xs text-blue">
                    {pick(lang, SELF_ASSESSMENT_UI.reviewLink)}
                    {t.sourceRef}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
