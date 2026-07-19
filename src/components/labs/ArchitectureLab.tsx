'use client';

import { useState } from 'react';
import { ARCH_COMPONENTS, type ArchComponent } from '@/data/architecture';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 01「读懂仓库地图」：包架构浏览器。
// 左侧组件卡片，右侧详情面板（角色 / 职责 / 关键源文件 / 依赖关系），
// 选中状态作为实验室快照持久化到 labResults。
export default function ArchitectureLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:architecture'];
  const initialId =
    saved && typeof saved === 'object' && 'selected' in saved && typeof saved.selected === 'string'
      ? saved.selected
      : ARCH_COMPONENTS[0].id;
  const [selectedId, setSelectedId] = useState(initialId);

  const selected: ArchComponent =
    ARCH_COMPONENTS.find((c) => c.id === selectedId) ?? ARCH_COMPONENTS[0];

  function select(id: string) {
    setSelectedId(id);
    setLabResult('lab:architecture', { selected: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">
        hermes-agent 是一个单仓库 Python 项目，文件极多，但承重墙只有六块。点击左侧任一组成部分，
        右侧会展开它的角色、职责、关键源文件，以及它依赖谁。
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {ARCH_COMPONENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                c.id === selected.id
                  ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-acid)]'
                  : 'border-line bg-white hover:border-muted'
              }`}
            >
              <p className={`font-medium ${c.id === selected.id ? 'text-acid' : ''}`}>{c.name}</p>
              <p
                className={`mt-0.5 text-xs ${c.id === selected.id ? 'text-white/60' : 'text-muted'}`}
              >
                {c.tagline}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-ink/20 bg-code-bg p-6 text-white md:p-8">
          <p className="font-mono text-[11px] tracking-[0.15em] text-acid">
            COMPONENT · {selected.id.toUpperCase()}
          </p>
          <h3 className="mt-2 font-serif text-3xl">{selected.name}</h3>
          <p className="mt-4 leading-relaxed text-white/75">{selected.role}</p>

          <h4 className="mt-7 font-mono text-xs tracking-[0.15em] text-white/50">职责</h4>
          <ul className="mt-2.5 space-y-1.5">
            {selected.responsibilities.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-sm text-white/85">
                <span className="mt-0.5 text-acid">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>

          <h4 className="mt-7 font-mono text-xs tracking-[0.15em] text-white/50">关键源文件</h4>
          <ul className="mt-2.5 space-y-2">
            {selected.keyFiles.map((f) => (
              <li key={f.path} className="text-sm">
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-ember">
                  {f.path}
                </code>
                <span className="ml-2 text-white/65">{f.note}</span>
              </li>
            ))}
          </ul>

          <h4 className="mt-7 font-mono text-xs tracking-[0.15em] text-white/50">依赖</h4>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {selected.dependsOn.length === 0 && (
              <span className="text-sm text-white/60">无依赖 —— 它是地基（被所有人导入）。</span>
            )}
            {selected.dependsOn.map((depId) => {
              const dep = ARCH_COMPONENTS.find((c) => c.id === depId);
              if (!dep) return null;
              return (
                <button
                  key={depId}
                  type="button"
                  onClick={() => select(depId)}
                  className="rounded border border-white/25 px-3 py-1 font-mono text-xs text-acid hover:border-acid"
                >
                  → {dep.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
