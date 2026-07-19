'use client';

import { useState } from 'react';
import { INTERVIEW_INTRO, LOOP_QUESTIONS } from '@/data/interview';
import { FlipCard } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 23「Agent 循环设计题」：面试问答卡。
// 每张卡 FlipCard：正面问题 + 思考提示 + 默念区，背面模范思路 + 追问链 + 评分维度；
// 「能答上来了」持久化到 labResults['lab:interview-loop'].mastered，顶部进度条统计攻克数。
export default function InterviewLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:interview-loop'];
  const initialMastered =
    saved &&
    typeof saved === 'object' &&
    'mastered' in saved &&
    saved.mastered &&
    typeof saved.mastered === 'object'
      ? (saved.mastered as Record<string, boolean>)
      : {};
  const [mastered, setMastered] = useState<Record<string, boolean>>(initialMastered);
  // 翻转状态是会话内的临时状态，不持久化
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const done = LOOP_QUESTIONS.filter((q) => mastered[q.id]).length;
  const total = LOOP_QUESTIONS.length;

  function toggleMastered(id: string) {
    const next = { ...mastered, [id]: !mastered[id] };
    setMastered(next);
    setLabResult('lab:interview-loop', { mastered: next });
  }

  function toggleFlipped(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{INTERVIEW_INTRO}</p>

      {/* 攻克进度条 */}
      <div className="mt-8 max-w-3xl rounded-lg border border-line bg-white p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">攻克进度</p>
          <p className="font-mono text-sm">
            <span className={done === total ? 'text-green' : 'text-ink'}>{done}</span>
            <span className="text-muted">/{total} 题已攻克</span>
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
          <div
            className={`h-full rounded-full transition-all ${done === total ? 'bg-green' : 'bg-acid'}`}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        {done === total && (
          <p className="mt-3 text-sm text-green">
            全部攻克——别忘了把追问链也过一遍，面试官真正拉开差距的地方在那里。
          </p>
        )}
      </div>

      {/* 题卡列表 */}
      <div className="mt-8 space-y-5">
        {LOOP_QUESTIONS.map((q, i) => {
          const isMastered = mastered[q.id] === true;
          const isFlipped = flipped[q.id] === true;
          return (
            <div key={q.id}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
                  Q{i + 1}/{total}
                </p>
                <button
                  type="button"
                  onClick={() => toggleMastered(q.id)}
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                    isMastered
                      ? 'border-green bg-green/10 text-green'
                      : 'border-line text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {isMastered ? '✓ 能答上来了' : '标记：能答上来了'}
                </button>
              </div>
              <FlipCard
                flipped={isFlipped}
                onFlip={() => toggleFlipped(q.id)}
                front={
                  <div>
                    <h3 className="font-serif text-xl leading-snug">{q.question}</h3>
                    <p className="mt-3 text-sm text-ink/70">
                      <span className="font-mono text-[11px] tracking-[0.15em] text-ember">
                        思考提示{' '}
                      </span>
                      {q.hint}
                    </p>
                    <div className="mt-4 rounded border border-dashed border-line bg-paper-deep p-4">
                      <p className="font-mono text-[11px] tracking-[0.15em] text-muted">我先想想</p>
                      <p className="mt-1.5 text-sm text-muted">
                        别急着翻。用 60 秒在脑子里组织一遍：先给结论，再给机制，最后给一个 Hermes
                        里的真实例子。
                      </p>
                    </div>
                  </div>
                }
                back={
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.15em] text-acid">模范思路</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/85">{q.answer}</p>
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <p className="font-mono text-[11px] tracking-[0.15em] text-ember">追问链</p>
                      <ul className="mt-2 space-y-2">
                        {q.followUps.map((f) => (
                          <li key={f} className="text-sm leading-relaxed text-white/70">
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <p className="font-mono text-[11px] tracking-[0.15em] text-ember">评分维度</p>
                      <ul className="mt-2 space-y-1.5">
                        {q.rubric.map((r) => (
                          <li key={r} className="flex items-start gap-2.5 text-sm text-white/70">
                            <span className="mt-0.5 text-acid">▸</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
