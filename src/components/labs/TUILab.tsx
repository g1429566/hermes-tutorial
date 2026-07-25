'use client';

import { useState } from 'react';
import {
  KEY_SURFACES,
  KEY_SURFACES_EN,
  SLASH_FLOW_STEPS,
  SLASH_FLOW_STEPS_EN,
  TUI_INTRO,
  TUI_INTRO_EN,
  TUI_LAB_UI,
  TUI_PROCESS_NODES,
  TUI_PROCESS_NODES_EN,
  WIDTH_DEMO,
  WIDTH_DEMO_EN,
  wrapTerminalLines,
} from '@/data/tui';
import { CodeBlock, DetailPanel, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { pick, useLang } from '@/lib/i18n';
import { t } from '@/data/ui-strings';

// Chapter 14「TUI 架构」：终端组件实验。
// 进程模型图 → Key Surfaces 表 → 斜杠命令流 Stepper → render(width) 迷你演示。
export default function TUILab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? TUI_INTRO_EN : TUI_INTRO;
  const processNodes = lang === 'en' ? TUI_PROCESS_NODES_EN : TUI_PROCESS_NODES;
  const keySurfaces = lang === 'en' ? KEY_SURFACES_EN : KEY_SURFACES;
  const slashSteps = lang === 'en' ? SLASH_FLOW_STEPS_EN : SLASH_FLOW_STEPS;
  const widthDemo = lang === 'en' ? WIDTH_DEMO_EN : WIDTH_DEMO;
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

  const node = processNodes.find((n) => n.id === nodeId) ?? processNodes[0];
  const surface = keySurfaces.find((k) => k.id === surfaceId) ?? keySurfaces[0];
  const step = slashSteps.find((f) => f.id === stepId) ?? slashSteps[0];
  const lines = wrapTerminalLines(widthDemo.text, width);

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
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      {/* ── ① 进程模型 ─────────────────────────────────────────── */}
      <SectionHeading
        kicker={pick(lang, TUI_LAB_UI.processKicker)}
        title={pick(lang, TUI_LAB_UI.processTitle)}
      />
      <div className="mt-6 flex flex-wrap items-stretch gap-y-3">
        {processNodes.map((n, i) => {
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
            <p className="font-mono text-[11px] tracking-[0.15em] text-white/40">
              {pick(lang, TUI_LAB_UI.keyFiles)}
            </p>
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
      <SectionHeading
        kicker={pick(lang, TUI_LAB_UI.surfacesKicker)}
        title={pick(lang, TUI_LAB_UI.surfacesTitle)}
      />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        {pick(lang, TUI_LAB_UI.surfacesHint)}
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
        <div className="grid grid-cols-[1fr_1.1fr_1.4fr] gap-2 border-b border-line bg-paper-deep px-4 py-2 font-mono text-[11px] tracking-[0.1em] text-muted">
          <span>Surface</span>
          <span>{pick(lang, TUI_LAB_UI.colInk)}</span>
          <span>{pick(lang, TUI_LAB_UI.colGateway)}</span>
        </div>
        {keySurfaces.map((k) => {
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
      <SectionHeading
        kicker={pick(lang, TUI_LAB_UI.slashKicker)}
        title={pick(lang, TUI_LAB_UI.slashTitle)}
      />
      <div className="mt-6">
        <Stepper
          steps={slashSteps.map((f) => ({ id: f.id, label: f.label }))}
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
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
            {t(lang, 'keyPoints')}
          </p>
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
      <SectionHeading
        kicker={pick(lang, TUI_LAB_UI.widthKicker)}
        title={pick(lang, TUI_LAB_UI.widthTitle)}
      />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        {pick(lang, TUI_LAB_UI.widthHint)}
      </p>
      <div className="mt-5 rounded-lg border border-line bg-white p-5">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={widthDemo.min}
            max={widthDemo.max}
            step={widthDemo.step}
            value={width}
            onChange={(e) => {
              const w = Number(e.target.value);
              setWidth(w);
              save({ width: w });
            }}
            className="w-full accent-ink"
            aria-label={pick(lang, TUI_LAB_UI.widthAria)}
          />
          <span className="shrink-0 font-mono text-sm text-ink">width = {width}</span>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg bg-code-bg p-4">
          <p className="font-mono text-[11px] text-white/40">
            render({width}) {pick(lang, TUI_LAB_UI.renderLines)(lines.length)}
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
        <p className="mt-4 text-sm leading-relaxed text-ink/70">{widthDemo.explain}</p>
      </div>

      <p className="mt-10 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {pick(lang, TUI_LAB_UI.footerNote)}
      </p>
    </section>
  );
}
