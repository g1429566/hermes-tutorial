'use client';

import { useState } from 'react';
import {
  COMPARE_TABLE,
  COMPARE_TABLE_EN,
  DECISION_FLOW,
  DECISION_FLOW_EN,
  INTEROP_INTRO,
  INTEROP_INTRO_EN,
  INTEROP_UI,
  PROTOCOLS,
  PROTOCOLS_EN,
} from '@/data/interop';
import { CompareSelect, DetailPanel, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 28「MCP / A2A 互操作」：协议对比面板。
// 上：四张协议卡（CompareSelect）→ 详情面板（参与方 / 传递内容 / 传输 / 边界 / 何时用 / 源码）；
// 中：四列对比表总结；下：「什么时候选哪个」决策小流程。
// 选中状态持久化到 labResults。
export default function InteropLab() {
  const { lang } = useLang();
  const protocols = lang === 'en' ? PROTOCOLS_EN : PROTOCOLS;
  const compareTable = lang === 'en' ? COMPARE_TABLE_EN : COMPARE_TABLE;
  const decisionFlow = lang === 'en' ? DECISION_FLOW_EN : DECISION_FLOW;
  const intro = lang === 'en' ? INTEROP_INTRO_EN : INTEROP_INTRO;

  const progress = useProgress();
  const saved = progress.labResults['lab:interop'];
  const initial =
    saved && typeof saved === 'object' && 'selected' in saved && typeof saved.selected === 'string'
      ? saved.selected
      : PROTOCOLS[0].id;
  const [selectedId, setSelectedId] = useState(initial);

  const protocol = protocols.find((p) => p.id === selectedId) ?? protocols[0];

  function select(id: string) {
    setSelectedId(id);
    setLabResult('lab:interop', { selected: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <div className="mt-8">
        <CompareSelect
          options={protocols.map((p) => ({ id: p.id, name: p.name, tagline: p.tagline }))}
          current={protocol.id}
          onChange={select}
        >
          <DetailPanel kicker={`PROTOCOL · ${protocol.id.toUpperCase()}`} title={protocol.name}>
            <dl className="mt-6 space-y-5">
              <div>
                <dt className="font-mono text-xs tracking-[0.15em] text-white/50">
                  {pick(lang, INTEROP_UI.parties)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-white/80">{protocol.parties}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-[0.15em] text-white/50">
                  {pick(lang, INTEROP_UI.payload)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-white/80">{protocol.payload}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-[0.15em] text-white/50">
                  {pick(lang, INTEROP_UI.transport)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-white/80">
                  {protocol.transport}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-[0.15em] text-ember">
                  {pick(lang, INTEROP_UI.boundary)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-white/80">
                  {protocol.boundary}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-[0.15em] text-white/50">
                  {pick(lang, INTEROP_UI.whenToUse)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-white/80">
                  {protocol.whenToUse}
                </dd>
              </div>
            </dl>

            <h4 className="mt-7 font-mono text-xs tracking-[0.15em] text-white/50">
              {pick(lang, INTEROP_UI.sourceHeading)}
            </h4>
            <ul className="mt-2.5 space-y-2">
              {protocol.source.map((s) => (
                <li key={s.path} className="text-sm">
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-ember">
                    {s.path}
                  </code>
                  <span className="ml-2 text-white/65">{s.note}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
        </CompareSelect>
      </div>

      <SectionHeading
        kicker={pick(lang, INTEROP_UI.tableKicker)}
        title={pick(lang, INTEROP_UI.tableTitle)}
      />
      <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-deep">
              <th className="px-4 py-3 text-left font-mono text-xs font-normal text-muted">
                {pick(lang, INTEROP_UI.dimension)}
              </th>
              {protocols.map((p) => (
                <th key={p.id} className="px-4 py-3 text-left font-medium">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareTable.map((row) => (
              <tr key={row.dimension} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 align-top font-mono text-xs text-ember">
                  {row.dimension}
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={`${row.dimension}-${protocols[i].id}`}
                    className={`px-4 py-3 align-top leading-relaxed ${
                      protocols[i].id === protocol.id ? 'bg-acid/10 text-ink' : 'text-ink/75'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-xs text-muted">{pick(lang, INTEROP_UI.highlightNote)}</p>

      <SectionHeading
        kicker={pick(lang, INTEROP_UI.decisionKicker)}
        title={pick(lang, INTEROP_UI.decisionTitle)}
      />
      <ol className="mt-5 max-w-3xl space-y-3">
        {decisionFlow.map((node, i) => (
          <li
            key={node.question}
            className="flex items-start gap-4 rounded-lg border border-line bg-white p-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs text-acid">
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{node.question}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/70">
                <span className="mr-1.5 font-mono text-ember">→</span>
                {node.answer}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
