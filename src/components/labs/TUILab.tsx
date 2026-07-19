'use client';

import { useState } from 'react';
import {
  KEY_SURFACES,
  SLASH_FLOW_STEPS,
  TUI_INTRO,
  TUI_PROCESS_NODES,
  WIDTH_DEMO,
  wrapTerminalLines,
} from '@/data/tui';
import { CodeBlock, DetailPanel, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 14「TUI 架构」：终端组件实验。
// 进程模型图 → Key Surfaces 表 → 斜杠命令流 Stepper → render(width) 迷你演示。
export default function TUILab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:tui'];
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};

  const [nodeId, setNodeId] = useState(
    typeof s.node === 'string' ? s.node : TUI_PROCESS_NODES[0].id,
  );
  const [surfaceId, setSurfaceId] = useState(
    typeof s.surface === 'string' ? s.surface : KEY_SURFACES[0].id,
  );
  const [stepId, setStepId] = useState(
    typeof s.step === 'string' ? s.step : SLASH_FLOW_STEPS[0].id,
  );
  const [width, setWidth] = useState(
    typeof s.width === 'number' && s.width >= WIDTH_DEMO.min && s.width <= WIDTH_DEMO.max
      ? s.width
      : WIDTH_DEMO.defaultWidth,
  );

  const node = TUI_PROCESS_NODES.find((n) => n.id === nodeId) ?? TUI_PROCESS_NODES[0];
  const surface = KEY_SURFACES.find((k) => k.id === surfaceId) ?? KEY_SURFACES[0];
  const step = SLASH_FLOW_STEPS.find((f) => f.id === stepId) ?? SLASH_FLOW_STEPS[0];
  const lines = wrapTerminalLines(WIDTH_DEMO.text, width);

  function save(next: { node?: string; surface?: string; step?: string; width?: number }) {
    setLabResult('lab:tui', {
      node: nodeId,
      surface: surfaceId,
      step: stepId,
      width,
      ...next,
    });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{TUI_INTRO}</p>

      {/* ── ① 进程模型 ─────────────────────────────────────────── */}
      <SectionHeading kicker="进程模型" title="两个进程，一份职责清单" />
      <div className="mt-6 flex flex-wrap items-stretch gap-y-3">
        {TUI_PROCESS_NODES.map((n, i) => {
          const active = n.id === node.id;
          return (
            <div key={n.id} className="flex items-center">
              {i > 0 && <span className="mx-2 font-mono text-muted">⇄</span>}
              <button
                type="button"
                onClick={() => {
                  setNodeId(n.id);
                  save({ node: n.id });
                }}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-acid)]'
                    : 'border-line bg-white hover:border-muted'
                }`}
              >
                <p className={`font-mono text-sm font-medium ${active ? 'text-acid' : ''}`}>
                  {n.name}
                </p>
                <p className={`mt-0.5 text-xs ${active ? 'text-white/60' : 'text-muted'}`}>
                  {n.role}
                </p>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <DetailPanel kicker="RESPONSIBILITIES" title={node.name}>
          <ul className="mt-4 space-y-2">
            {node.owns.map((o) => (
              <li key={o} className="flex items-start gap-2.5 text-sm text-white/80">
                <span className="mt-0.5 text-acid">▸</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="font-mono text-[11px] tracking-[0.15em] text-white/40">关键源码</p>
            <ul className="mt-2 space-y-1.5">
              {node.files.map((f) => (
                <li key={f.path} className="text-sm">
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-ember">
                    {f.path}
                  </code>
                  <span className="ml-2 text-white/60">{f.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </DetailPanel>
      </div>

      {/* ── ② Key Surfaces ─────────────────────────────────────── */}
      <SectionHeading kicker="Key Surfaces" title="界面 ↔ RPC 对照表" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        每一块界面能力都对应一组 Ink 组件与 gateway 方法。点击任意一行看它如何工作。
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
        <div className="grid grid-cols-[1fr_1.1fr_1.4fr] gap-2 border-b border-line bg-paper-deep px-4 py-2 font-mono text-[11px] tracking-[0.1em] text-muted">
          <span>Surface</span>
          <span>Ink 组件</span>
          <span>Gateway 方法</span>
        </div>
        {KEY_SURFACES.map((k) => {
          const active = k.id === surface.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setSurfaceId(k.id);
                save({ surface: k.id });
              }}
              className={`grid w-full grid-cols-[1fr_1.1fr_1.4fr] gap-2 border-b border-line px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 ${
                active ? 'bg-ink text-white' : 'hover:bg-paper-deep'
              }`}
            >
              <span className={`font-medium ${active ? 'text-acid' : ''}`}>{k.surface}</span>
              <code className={`font-mono text-xs ${active ? 'text-white/80' : 'text-ember'}`}>
                {k.ink}
              </code>
              <code className={`font-mono text-xs ${active ? 'text-white/80' : 'text-muted'}`}>
                {k.gateway}
              </code>
            </button>
          );
        })}
      </div>
      <p className="mt-3 max-w-3xl rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-ink/75">
        <span className="font-mono text-xs text-ember">{surface.surface} · </span>
        {surface.note}
      </p>

      {/* ── ③ 斜杠命令流 ───────────────────────────────────────── */}
      <SectionHeading kicker="斜杠命令流" title="一条 /command 的三级路由" />
      <div className="mt-6">
        <Stepper
          steps={SLASH_FLOW_STEPS.map((f) => ({ id: f.id, label: f.label }))}
          current={step.id}
          onChange={(id) => {
            setStepId(id);
            save({ step: id });
          }}
        />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <h4 className="font-serif text-xl">{step.title}</h4>
          <p className="mt-3 leading-relaxed text-ink/75">{step.body}</p>
          <div className="mt-5">
            <CodeBlock file={step.code.file} code={step.code.snippet} note={step.code.note} />
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">要点</p>
          <ul className="mt-3 space-y-2">
            {step.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                <span className="mt-0.5 text-acid">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── ④ render(width) 演示 ───────────────────────────────── */}
      <SectionHeading kicker="render(width)" title="宽度驱动的重渲染" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        拖动滑杆改变「终端宽度」，下方文本会像真实终端一样按新宽度重排。
      </p>
      <div className="mt-5 rounded-lg border border-line bg-white p-5">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={WIDTH_DEMO.min}
            max={WIDTH_DEMO.max}
            step={WIDTH_DEMO.step}
            value={width}
            onChange={(e) => {
              const w = Number(e.target.value);
              setWidth(w);
              save({ width: w });
            }}
            className="w-full accent-ink"
            aria-label="终端宽度"
          />
          <span className="shrink-0 font-mono text-sm text-ink">width = {width}</span>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg bg-code-bg p-4">
          <p className="font-mono text-[11px] text-white/40">
            render({width}) → {lines.length} 行
          </p>
          <div className="mt-2 space-y-0.5">
            {lines.map((line, i) => (
              <p key={`${width}-${i}`} className="font-mono text-[13px] leading-6 text-white/85">
                <span className="mr-3 inline-block w-6 text-right text-white/30">{i}</span>
                {line}
              </p>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink/70">{WIDTH_DEMO.explain}</p>
      </div>

      <p className="mt-10 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        一句话记住 TUI：TypeScript 拥有屏幕，Python 拥有会话——中间只隔着换行分隔的
        JSON-RPC。dashboard 里的聊天也不是重写，而是通过 PTY 嵌入真实的 hermes --tui。
      </p>
    </section>
  );
}
