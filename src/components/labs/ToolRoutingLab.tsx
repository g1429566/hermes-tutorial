'use client';

import { useState } from 'react';
import {
  EXEC_FLOW,
  EXEC_FLOW_EN,
  REGISTER_CHAIN,
  REGISTER_CHAIN_EN,
  TOOL_ROUTING_HOOK,
  TOOL_ROUTING_HOOK_EN,
  TOOL_ROUTING_INTRO,
  TOOL_ROUTING_INTRO_EN,
  TOOL_ROUTING_UI,
  TOOLS,
  TOOLS_EN,
} from '@/data/tools';
import { CodeBlock, Explorer, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 07「工具与 toolsets」：工具路由实验室。
// 左：10 个真实工具；右：schema（JSON）+ 注册位置 + check_fn 环境检查。
// 下方两条链路：注册链路（import → discover → toolset → 平台 adapter）与
// 执行流程（pre_tool_call → handler → JSON → post_tool_call）。
export default function ToolRoutingLab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? TOOL_ROUTING_INTRO_EN : TOOL_ROUTING_INTRO;
  const tools = lang === 'en' ? TOOLS_EN : TOOLS;
  const registerChain = lang === 'en' ? REGISTER_CHAIN_EN : REGISTER_CHAIN;
  const execFlow = lang === 'en' ? EXEC_FLOW_EN : EXEC_FLOW;
  const hook = lang === 'en' ? TOOL_ROUTING_HOOK_EN : TOOL_ROUTING_HOOK;
  const progress = useProgress();
  const saved = progress.labResults['lab:tool-routing'];
  const initial =
    saved && typeof saved === 'object' && 'tool' in saved && typeof saved.tool === 'string'
      ? saved.tool
      : tools[0].id;
  const [toolId, setToolId] = useState(initial);

  const tool = tools.find((t) => t.id === toolId) ?? tools[0];

  function select(id: string) {
    setToolId(id);
    setLabResult('lab:tool-routing', { tool: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <div className="mt-8">
        <Explorer
          items={tools.map((t) => ({ id: t.id, name: t.name, tagline: t.tagline }))}
          current={tool.id}
          onChange={select}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-white p-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <code className="font-mono text-lg text-ember">{tool.name}</code>
                <span className="rounded-full border border-blue/40 bg-blue/10 px-2.5 py-0.5 font-mono text-[11px] text-blue">
                  toolset: {tool.toolset}
                </span>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <dt className="w-28 shrink-0 font-mono text-[11px] tracking-[0.15em] text-muted">
                    {pick(lang, TOOL_ROUTING_UI.implFile)}
                  </dt>
                  <dd>
                    <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-ink">
                      {tool.file}
                    </code>
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <dt className="w-28 shrink-0 font-mono text-[11px] tracking-[0.15em] text-muted">
                    {pick(lang, TOOL_ROUTING_UI.registerAt)}
                  </dt>
                  <dd>
                    <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-ink">
                      {tool.registerLine}
                    </code>
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <dt className="w-28 shrink-0 pt-0.5 font-mono text-[11px] tracking-[0.15em] text-muted">
                    check_fn
                  </dt>
                  <dd className="leading-relaxed text-ink/75">{tool.check}</dd>
                </div>
                {tool.note && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                    <dt className="w-28 shrink-0 pt-0.5 font-mono text-[11px] tracking-[0.15em] text-muted">
                      {pick(lang, TOOL_ROUTING_UI.noteLabel)}
                    </dt>
                    <dd className="leading-relaxed text-ink/75">{tool.note}</dd>
                  </div>
                )}
              </dl>
            </div>
            <CodeBlock
              file={pick(lang, TOOL_ROUTING_UI.schemaFile)(tool.toolset)}
              code={tool.schema}
              note={pick(lang, TOOL_ROUTING_UI.schemaNote)}
            />
          </div>
        </Explorer>
      </div>

      <SectionHeading
        kicker={pick(lang, TOOL_ROUTING_UI.chainKicker)}
        title={pick(lang, TOOL_ROUTING_UI.chainTitle)}
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {registerChain.map((c, i) => (
          <div key={c.id} className="relative rounded-lg border border-line bg-white p-5">
            <h4 className="font-medium">{c.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.body}</p>
            <p className="mt-3 font-mono text-[11px] text-ember">{c.file}</p>
            {i < registerChain.length - 1 && (
              <span className="absolute top-1/2 -right-3 hidden -translate-y-1/2 font-mono text-muted xl:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 max-w-3xl font-mono text-xs leading-relaxed text-muted">
        {pick(lang, TOOL_ROUTING_UI.depChain)}
      </p>

      <SectionHeading
        kicker={pick(lang, TOOL_ROUTING_UI.execKicker)}
        title={pick(lang, TOOL_ROUTING_UI.execTitle)}
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {execFlow.map((c, i) => (
          <div key={c.id} className="relative rounded-lg border border-line bg-white p-5">
            <h4 className="font-medium">{c.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.body}</p>
            <p className="mt-3 font-mono text-[11px] text-ember">{c.file}</p>
            {i < execFlow.length - 1 && (
              <span className="absolute top-1/2 -right-3 hidden -translate-y-1/2 font-mono text-muted xl:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <SectionHeading
        kicker={pick(lang, TOOL_ROUTING_UI.hookKicker)}
        title={pick(lang, TOOL_ROUTING_UI.hookTitle)}
      />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {hook}
      </p>
    </section>
  );
}
