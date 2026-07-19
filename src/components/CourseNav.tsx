'use client';

import { useRef, useState } from 'react';
import { CHAPTERS, MODULE_ORDER, MODULES } from '@/data/chapters';
import { exportProgress, importProgress, resetProgress } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

interface CourseNavProps {
  currentId: string;
  onNavigate: (id: string) => void;
}

function downloadProgress() {
  const blob = new Blob([exportProgress()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hermes-tutorial-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

export default function CourseNav({ currentId, onNavigate }: CourseNavProps) {
  const progress = useProgress();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const done = Object.values(progress.chapters).filter((s) => s === 'complete').length;
  const total = CHAPTERS.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  function go(id: string) {
    onNavigate(id);
    setOpen(false);
  }

  function onImportFile(file: File | undefined) {
    if (!file) return;
    file
      .text()
      .then((text) => {
        if (!importProgress(text)) window.alert('导入失败：文件不是有效的进度数据。');
      })
      .catch(() => window.alert('导入失败：无法读取文件。'));
  }

  const navBody = (
    <>
      <div className="px-5 pt-6 pb-4">
        <p className="font-mono text-xs tracking-[0.2em] text-acid">HERMES // 教程</p>
        <h1 className="mt-2 font-serif text-xl leading-snug text-white">Hermes Agent 学习教程</h1>
        <div className="mt-4">
          <div className="flex items-baseline justify-between font-mono text-[11px] text-white/60">
            <span>进度</span>
            <span>
              {done}/{total} 章 · {pct}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded bg-white/15">
            <div
              className="h-full rounded bg-acid transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {MODULE_ORDER.map((mid) => (
          <div key={mid} className="mt-4 first:mt-1">
            <p className="px-2 pb-1.5 font-mono text-[11px] tracking-[0.15em] text-white/40">
              {MODULES[mid].label} · {MODULES[mid].title}
            </p>
            <ul>
              {CHAPTERS.filter((c) => c.module === mid).map((c) => {
                const status = progress.chapters[c.id] ?? 'not-started';
                const current = c.id === currentId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => go(c.id)}
                      className={`flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[13px] transition-colors ${
                        current
                          ? 'bg-white/10 text-white shadow-[inset_2px_0_0_0_var(--color-acid)]'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="w-6 shrink-0 font-mono text-[11px] text-white/40">
                        {c.number}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <span
                        className={`shrink-0 font-mono text-[11px] ${
                          status === 'complete'
                            ? 'text-acid'
                            : status === 'reading'
                              ? 'text-ember'
                              : 'text-white/25'
                        }`}
                        title={
                          status === 'complete'
                            ? '已完成'
                            : status === 'reading'
                              ? '在读'
                              : '未开始'
                        }
                      >
                        {status === 'complete' ? '✓' : status === 'reading' ? '●' : '○'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex gap-2 font-mono text-[11px]">
          <button
            type="button"
            onClick={downloadProgress}
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:border-acid hover:text-acid"
          >
            导出
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:border-acid hover:text-acid"
          >
            导入
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('确定要重置全部学习进度吗？此操作不可撤销。')) resetProgress();
            }}
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:border-red hover:text-red"
          >
            重置
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            onImportFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </>
  );

  return (
    <>
      {/* 移动端顶栏 */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 bg-ink px-4 py-2.5 lg:hidden">
        <button
          type="button"
          aria-label="打开目录"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-lg text-acid"
        >
          {open ? '✕' : '☰'}
        </button>
        <span className="font-mono text-xs tracking-[0.2em] text-white/80">HERMES // 教程</span>
        <span className="ml-auto font-mono text-[11px] text-white/50">
          {done}/{total}
        </span>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-ink transition-transform duration-200 lg:z-30 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navBody}
      </aside>
    </>
  );
}
