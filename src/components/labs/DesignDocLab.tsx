'use client';

import { useState } from 'react';
import { DESIGN_DOC_INTRO, DESIGN_DOC_SECTIONS } from '@/data/design-doc';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 25「系统设计面试」：Design Doc 模板长表单。
// 六个小节，每节展示「面试官想听什么」+ Hermes 对应实例 + 可展开的 textarea；
// 填写内容持久化到 labResults['lab:interview-design-doc'].sections，顶部显示完成度 x/6。
export default function DesignDocLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:interview-design-doc'];
  const initialSections =
    saved &&
    typeof saved === 'object' &&
    'sections' in saved &&
    saved.sections &&
    typeof saved.sections === 'object'
      ? (saved.sections as Record<string, string>)
      : {};
  const [sections, setSections] = useState<Record<string, string>>(initialSections);

  const filled = DESIGN_DOC_SECTIONS.filter((s) => (sections[s.id] ?? '').trim().length > 0).length;
  const total = DESIGN_DOC_SECTIONS.length;

  function update(id: string, value: string) {
    const next = { ...sections, [id]: value };
    setSections(next);
    setLabResult('lab:interview-design-doc', { sections: next });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{DESIGN_DOC_INTRO}</p>

      {/* 完成度 */}
      <div className="mt-8 max-w-3xl rounded-lg border border-line bg-white p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">文档完成度</p>
          <p className="font-mono text-sm">
            <span className={filled === total ? 'text-green' : 'text-ink'}>{filled}</span>
            <span className="text-muted">/{total} 节已填写</span>
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
          <div
            className={`h-full rounded-full transition-all ${filled === total ? 'bg-green' : 'bg-acid'}`}
            style={{ width: `${(filled / total) * 100}%` }}
          />
        </div>
      </div>

      {/* 六节长表单 */}
      <div className="mt-8 space-y-5">
        {DESIGN_DOC_SECTIONS.map((s) => {
          const hasContent = (sections[s.id] ?? '').trim().length > 0;
          return (
            <div key={s.id} className="rounded-lg border border-line bg-white p-6">
              <div className="flex items-baseline gap-3">
                <h4 className="font-serif text-xl">{s.title}</h4>
                {hasContent && <span className="font-mono text-xs text-green">✓ 已填写</span>}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-line bg-paper-deep p-4">
                  <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
                    面试官想听什么
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {s.interviewerWants.map((w) => (
                      <li key={w} className="flex items-start gap-2.5 text-sm text-ink/80">
                        <span className="mt-0.5 text-ember">▸</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-ink/20 bg-code-bg p-4">
                  <p className="font-mono text-[11px] tracking-[0.15em] text-acid">
                    HERMES 对应实例
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">{s.hermesExample}</p>
                </div>
              </div>

              <details className="group mt-4">
                <summary className="cursor-pointer list-none rounded border border-dashed border-line px-4 py-2.5 font-mono text-xs text-muted transition-colors hover:border-ink hover:text-ink">
                  <span className="group-open:hidden">▼ 展开，写下我的答案要点</span>
                  <span className="hidden group-open:inline">▲ 收起（内容已自动保存）</span>
                </summary>
                <textarea
                  value={sections[s.id] ?? ''}
                  onChange={(e) => update(s.id, e.target.value)}
                  placeholder={s.placeholder}
                  rows={5}
                  className="mt-3 w-full rounded-lg border border-line bg-paper p-4 font-mono text-sm leading-relaxed text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none"
                />
              </details>
            </div>
          );
        })}
      </div>
    </section>
  );
}
