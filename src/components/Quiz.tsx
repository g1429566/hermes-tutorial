'use client';

import { useState } from 'react';
import { judge, type QuizItem } from '@/lib/judge';
import { recordQuizScore } from '@/lib/progress-v2';

interface QuizProps {
  item: QuizItem;
}

// 测验卡片 + 即时反馈。判定逻辑在 src/lib/judge.ts（纯函数，已单测），
// 成绩写入进度系统 v2 的 quizScores。
export default function Quiz({ item }: QuizProps) {
  const { id, question, options, correct, explanation, multiple = false } = item;
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggle(key: string) {
    if (submitted) return;
    setSelected((prev) =>
      multiple ? (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]) : [key],
    );
  }

  function submit() {
    if (selected.length === 0) return;
    const ok = judge(selected, correct, multiple);
    recordQuizScore(id, ok ? 1 : 0, 1);
    setSubmitted(true);
  }

  function retry() {
    setSelected([]);
    setSubmitted(false);
  }

  const isCorrect = submitted && judge(selected, correct, multiple);

  return (
    <div className="rounded-lg border border-line bg-white p-6">
      <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
        QUIZ{multiple ? ' · 多选' : ''}
      </p>
      <p className="mt-2 font-medium">{question}</p>
      <ul className="mt-4 space-y-2">
        {options.map((o) => {
          const checked = selected.includes(o.key);
          return (
            <li key={o.key}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2 text-sm transition-colors ${
                  checked ? 'border-acid bg-acid/10' : 'border-line hover:border-muted'
                } ${submitted ? 'cursor-default' : ''}`}
              >
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={`quiz-${id}`}
                  checked={checked}
                  onChange={() => toggle(o.key)}
                  disabled={submitted}
                  className="mt-0.5 accent-[#65a30d]"
                />
                <span>{o.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {!submitted && (
        <button
          type="button"
          onClick={submit}
          disabled={selected.length === 0}
          className="mt-4 rounded bg-ink px-4 py-2 font-mono text-sm text-acid disabled:opacity-40"
        >
          提交
        </button>
      )}
      {submitted && (
        <div className="mt-4 border-t border-line pt-4">
          <p className={`font-mono text-sm font-bold ${isCorrect ? 'text-green' : 'text-red'}`}>
            {isCorrect ? '✓ 正确！' : '✗ 不完全正确'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{explanation}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
}
