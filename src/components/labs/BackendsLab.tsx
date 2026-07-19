'use client';

import { useState } from 'react';
import { BACKENDS, BACKENDS_INTRO, COMPARE_ROWS, SERVERLESS_STEPS } from '@/data/backends';
import { CompareSelect, DetailPanel, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 16「终端后端」：6 种后端 CompareSelect + serverless 休眠/唤醒 Stepper + 对比表。
export default function BackendsLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:backends'];
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};

  const [backendId, setBackendId] = useState(
    typeof s.backend === 'string' ? s.backend : BACKENDS[0].id,
  );
  const [stepId, setStepId] = useState(
    typeof s.step === 'string' ? s.step : SERVERLESS_STEPS[0].id,
  );

  const backend = BACKENDS.find((b) => b.id === backendId) ?? BACKENDS[0];
  const step = SERVERLESS_STEPS.find((f) => f.id === stepId) ?? SERVERLESS_STEPS[0];

  function save(next: { backend?: string; step?: string }) {
    setLabResult('lab:backends', { backend: backendId, step: stepId, ...next });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{BACKENDS_INTRO}</p>

      {/* ── ① 六种后端对比 ─────────────────────────────────────── */}
      <SectionHeading kicker="执行环境" title="六种后端，同一套接口" />
      <div className="mt-6">
        <CompareSelect
          options={BACKENDS.map((b) => ({ id: b.id, name: b.name, tagline: b.tagline }))}
          current={backend.id}
          onChange={(id) => {
            setBackendId(id);
            save({ backend: id });
          }}
        >
          <DetailPanel kicker={backend.source} title={backend.name}>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <p className="font-mono text-[11px] tracking-[0.15em] text-white/40">隔离级别</p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{backend.isolation}</p>
                <p className="mt-4 font-mono text-[11px] tracking-[0.15em] text-white/40">
                  适用场景
                </p>
                <ul className="mt-2 space-y-1.5">
                  {backend.scenarios.map((sc) => (
                    <li key={sc} className="flex items-start gap-2.5 text-sm text-white/80">
                      <span className="mt-0.5 text-blue">▸</span>
                      <span>{sc}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.15em] text-white/40">
                  特点（源自源码）
                </p>
                <ul className="mt-2 space-y-1.5">
                  {backend.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                      <span className="mt-0.5 text-acid">▸</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DetailPanel>
        </CompareSelect>
      </div>

      {/* ── ② serverless 休眠/唤醒时序（仅 Modal / Daytona） ─────── */}
      {backend.serverless && (
        <div className="mt-8">
          <SectionHeading kicker="serverless 时序" title="休眠 / 唤醒的五个阶段" />
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
            {backend.name} 是 serverless 后端：不用时休眠省成本，用时冷启动恢复。
            点击每个阶段看细节。
          </p>
          <div className="mt-5">
            <Stepper
              steps={SERVERLESS_STEPS.map((f) => ({ id: f.id, label: f.label }))}
              current={step.id}
              onChange={(id) => {
                setStepId(id);
                save({ step: id });
              }}
            />
          </div>
          <div className="mt-5 rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
              {backend.name} · {step.label}
            </p>
            <h4 className="mt-2 font-serif text-xl">{step.title}</h4>
            <p className="mt-3 leading-relaxed text-ink/75">{step.body}</p>
          </div>
        </div>
      )}

      {/* ── ③ 对比表 ───────────────────────────────────────────── */}
      <SectionHeading kicker="横向对比" title="一张表看懂六种后端" />
      <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-deep font-mono text-[11px] tracking-[0.1em] text-muted">
              <th className="px-4 py-2.5 font-medium">后端</th>
              <th className="px-4 py-2.5 font-medium">隔离性</th>
              <th className="px-4 py-2.5 font-medium">成本</th>
              <th className="px-4 py-2.5 font-medium">启动速度</th>
              <th className="px-4 py-2.5 font-medium">适用平台</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => {
              const b = BACKENDS.find((x) => x.id === row.id);
              const active = row.id === backend.id;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-line last:border-b-0 ${active ? 'bg-acid/15' : ''}`}
                >
                  <td className="px-4 py-2.5 font-mono font-medium">{b?.name ?? row.id}</td>
                  <td className="px-4 py-2.5 text-ink/75">{row.isolation}</td>
                  <td className="px-4 py-2.5 text-ink/75">{row.cost}</td>
                  <td className="px-4 py-2.5 text-ink/75">{row.startup}</td>
                  <td className="px-4 py-2.5 text-ink/75">{row.platform}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted">
        定性对比，依据各后端源码 docstring 与配置项；当前选中的后端以绿色高亮。
      </p>

      <p className="mt-10 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        一句话记住终端后端：同一套 BaseEnvironment 接口，六种「跑法」—— 本机求快、 容器求隔离、SSH
        借算力、serverless 用冷启动换成本。
      </p>
    </section>
  );
}
