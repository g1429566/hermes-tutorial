import { useState } from 'react';
import { useSyncExternalStore } from 'react';
import { getSnapshot, setItem, subscribe } from '../lib/progress';
import { judge, type QuizOption } from '../lib/judge';

interface QuizProps {
  id: string;
  question: string;
  options: QuizOption[];
  correct: string[];
  explanation: string;
  multiple?: boolean;
}

export default function Quiz({
  id,
  question,
  options,
  correct,
  explanation,
  multiple = false,
}: QuizProps) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
    if (judge(selected, correct, multiple)) setItem(`quiz:${id}`, true);
    setSubmitted(true);
  }
  function reset() {
    setSelected([]);
    setSubmitted(false);
  }
  const isCorrect = submitted && judge(selected, correct, multiple);

  return (
    <div className="ht-quiz">
      <p className="ht-quiz-question">{question}</p>
      <ul className="ht-quiz-options">
        {options.map((o) => (
          <li key={o.key}>
            <label>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`quiz-${id}`}
                checked={selected.includes(o.key)}
                onChange={() => toggle(o.key)}
                disabled={submitted}
              />{' '}
              {o.text}
            </label>
          </li>
        ))}
      </ul>
      {!submitted && (
        <button type="button" onClick={submit} disabled={selected.length === 0}>
          提交
        </button>
      )}
      {submitted && (
        <div className="ht-quiz-feedback">
          <p className="ht-quiz-result" data-correct={isCorrect}>
            {isCorrect ? '✅ 正确！' : '❌ 不完全正确'}
          </p>
          <p>{explanation}</p>
          <button type="button" onClick={reset}>
            重试
          </button>
        </div>
      )}
    </div>
  );
}
