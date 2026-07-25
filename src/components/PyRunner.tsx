'use client';

// PyRunner：浏览器内 Python 沙箱（pyodide / WebAssembly）。
// 运行时从 /pyodide/ 按需加载（postinstall 已从 npm 包 vendor 到 public/，完全离线可用），
// 首次运行加载约 15MB，之后常驻内存，反复运行零成本。

import { useState } from 'react';
import type { PyodideInterface } from 'pyodide';
import { useLang } from '@/lib/i18n';
import { t } from '@/data/ui-strings';

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`脚本加载失败：${src}`));
    document.head.appendChild(s);
  });
}

function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScript('/pyodide/pyodide.js');
      if (!window.loadPyodide) throw new Error('pyodide.js 已加载但未暴露 loadPyodide');
      return window.loadPyodide({ indexURL: '/pyodide/' });
    })();
  }
  return pyodidePromise;
}

type RunStatus = 'idle' | 'loading' | 'running';

interface PyRunnerProps {
  title: string;
  initialCode: string;
  note?: string;
}

export default function PyRunner({ title, initialCode, note }: PyRunnerProps) {
  const { lang } = useLang();
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [output, setOutput] = useState<string[] | null>(null);

  async function run() {
    setOutput(null);
    setStatus('loading');
    try {
      const pyodide = await getPyodide();
      setStatus('running');
      const lines: string[] = [];
      pyodide.setStdout({ batched: (s: string) => lines.push(s) });
      pyodide.setStderr({ batched: (s: string) => lines.push(s) });
      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined) lines.push(`⇒ ${String(result)}`);
      setOutput(lines);
    } catch (e) {
      setOutput([`✗ ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setStatus('idle');
    }
  }

  const busy = status !== 'idle';

  return (
    <div className="overflow-hidden rounded-lg border border-ink/20 bg-code-bg text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-xs text-acid">{title}</span>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="rounded bg-acid px-3 py-1 font-mono text-xs font-bold text-ink disabled:opacity-50"
        >
          {status === 'loading'
            ? t(lang, 'pyLoading')
            : status === 'running'
              ? t(lang, 'pyRunning')
              : t(lang, 'pyRun')}
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={Math.min(24, Math.max(8, code.split('\n').length + 1))}
        className="w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-6 text-white/90 focus:outline-none"
      />
      {note && <p className="border-t border-white/10 px-4 py-2 text-xs text-white/55">{note}</p>}
      {output !== null && (
        <pre className="max-h-72 overflow-auto border-t border-white/10 bg-black/30 p-4 font-mono text-xs leading-5 text-acid">
          {output.length > 0 ? output.join('\n') : t(lang, 'pyNoOutput')}
        </pre>
      )}
      {output === null && busy && (
        <p className="border-t border-white/10 px-4 py-2 font-mono text-xs text-white/50">
          {status === 'loading' ? t(lang, 'pyFirstLoad') : t(lang, 'pyExecuting')}
        </p>
      )}
    </div>
  );
}
