'use client';

import { useState } from 'react';
import {
  EXEC_FLOW,
  REGISTER_CHAIN,
  TOOL_ROUTING_HOOK,
  TOOL_ROUTING_INTRO,
  TOOLS,
} from '@/data/tools';
import { CodeBlock, Explorer, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 07「工具与 toolsets」：工具路由实验室。
// 左：10 个真实工具；右：schema（JSON）+ 注册位置 + check_fn 环境检查。
// 下方两条链路：注册链路（import → discover → toolset → 平台 adapter）与
// 执行流程（pre_tool_call → handler → JSON → post_tool_call）。
export default function ToolRoutingLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:tool-routing'];
  const initial =
    saved && typeof saved === 'object' && 'tool' in saved && typeof saved.tool === 'string'
      ? saved.tool
      : TOOLS[0].id;
  const [toolId, setToolId] = useState(initial);

  const tool = TOOLS.find((t) => t.id === toolId) ?? TOOLS[0];

  function select(id: string) {
    setToolId(id);
    setLabResult('lab:tool-routing', { tool: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{TOOL_ROUTING_INTRO}</p>

      <div className="mt-8">
        <Explorer
          items={TOOLS.map((t) => ({ id: t.id, name: t.name, tagline: t.tagline }))}
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
                    实现文件
                  </dt>
                  <dd>
                    <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-ink">
                      {tool.file}
                    </code>
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <dt className="w-28 shrink-0 font-mono text-[11px] tracking-[0.15em] text-muted">
                    注册位置
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
                      备注
                    </dt>
                    <dd className="leading-relaxed text-ink/75">{tool.note}</dd>
                  </div>
                )}
              </dl>
            </div>
            <CodeBlock
              file={`schema · toolsets.py 的 "${tool.toolset}" toolset 收录后模型可见`}
              code={tool.schema}
              note="所有 handler 必须返回 JSON 字符串（AGENTS.md 硬性约定）"
            />
          </div>
        </Explorer>
      </div>

      <SectionHeading kicker="注册链路" title="从 tools/*.py 到模型可见：四道门" />
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {REGISTER_CHAIN.map((c, i) => (
          <div key={c.id} className="relative rounded-lg border border-line bg-white p-5">
            <h4 className="font-medium">{c.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.body}</p>
            <p className="mt-3 font-mono text-[11px] text-ember">{c.file}</p>
            {i < REGISTER_CHAIN.length - 1 && (
              <span className="absolute top-1/2 -right-3 hidden -translate-y-1/2 font-mono text-muted xl:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 max-w-3xl font-mono text-xs leading-relaxed text-muted">
        依赖链方向：tools/registry.py（无依赖）← tools/*.py ← model_tools.py ← run_agent.py / cli.py
        / batch_runner.py（AGENTS.md §File Dependency Chain）
      </p>

      <SectionHeading kicker="执行流程" title="一次 tool_call 的旅程" />
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {EXEC_FLOW.map((c, i) => (
          <div key={c.id} className="relative rounded-lg border border-line bg-white p-5">
            <h4 className="font-medium">{c.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.body}</p>
            <p className="mt-3 font-mono text-[11px] text-ember">{c.file}</p>
            {i < EXEC_FLOW.length - 1 && (
              <span className="absolute top-1/2 -right-3 hidden -translate-y-1/2 font-mono text-muted xl:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <SectionHeading kicker="记忆钩子" title="一句话记住工具路由" />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {TOOL_ROUTING_HOOK}
      </p>
    </section>
  );
}
