'use client';

import { useState } from 'react';
import {
  GATEWAY_INTRO,
  GATEWAY_PLATFORMS,
  GATEWAY_REGISTRY_NOTE,
  GATEWAY_TOPOLOGY,
} from '@/data/gateway';
import { DetailPanel, Explorer, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 10「消息网关（上）」：网关拓扑图。
// 三栏拓扑（平台 adapters → gateway 进程 → agent 核心）+ 平台 Explorer 看 adapter 详情。
export default function GatewayLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:gateway'];
  const initial =
    saved && typeof saved === 'object' && 'platform' in saved && typeof saved.platform === 'string'
      ? saved.platform
      : GATEWAY_PLATFORMS[0].id;
  const [platformId, setPlatformId] = useState(initial);

  const platform = GATEWAY_PLATFORMS.find((p) => p.id === platformId) ?? GATEWAY_PLATFORMS[0];

  function select(id: string) {
    setPlatformId(id);
    setLabResult('lab:gateway', { platform: id });
  }

  const columns = [GATEWAY_TOPOLOGY.left, GATEWAY_TOPOLOGY.middle, GATEWAY_TOPOLOGY.right];

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{GATEWAY_INTRO}</p>

      {/* 拓扑图：flex 三栏 + 箭头字符自绘 */}
      <div className="mt-8 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        {columns.map((col, i) => (
          <div
            key={col.title}
            className="flex flex-1 flex-col items-stretch gap-3 lg:flex-row lg:items-center"
          >
            {i > 0 && (
              <span
                aria-hidden
                className="self-center font-mono text-2xl text-muted max-lg:rotate-90"
              >
                →
              </span>
            )}
            <div className="flex-1 rounded-lg border border-line bg-white p-5">
              <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-1 font-serif text-xl">{col.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{col.body}</p>
              {i === 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {GATEWAY_PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => select(p.id)}
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors ${
                        p.id === platform.id
                          ? 'border-ink bg-ink text-acid'
                          : 'border-line bg-paper-deep text-ink/70 hover:border-muted'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {i === 1 && (
                <p className="mt-3 font-mono text-xs text-muted">
                  gateway/run.py · gateway/session.py
                </p>
              )}
              {i === 2 && <p className="mt-3 font-mono text-xs text-muted">run_agent.py</p>}
            </div>
          </div>
        ))}
      </div>

      <SectionHeading kicker="逐平台拆解" title="adapter 详情" />
      <div className="mt-6">
        <Explorer
          items={GATEWAY_PLATFORMS.map((p) => ({ id: p.id, name: p.name, tagline: p.tagline }))}
          current={platform.id}
          onChange={select}
        >
          <DetailPanel
            kicker={platform.builtin ? 'BUILT-IN ADAPTER' : 'PLUGIN PLATFORM'}
            title={platform.name}
          >
            <div className="mt-5">
              <p className="font-mono text-[11px] tracking-[0.15em] text-white/50">源码路径</p>
              <p className="mt-1.5 font-mono text-sm text-ember">{platform.source}</p>
              {platform.extraSources?.map((s) => (
                <p key={s} className="mt-1 font-mono text-sm text-white/60">
                  {s}
                </p>
              ))}
            </div>
            <div className="mt-5">
              <p className="font-mono text-[11px] tracking-[0.15em] text-white/50">平台特性</p>
              <ul className="mt-2 space-y-2">
                {platform.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                    <span className="mt-0.5 text-acid">▸</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </DetailPanel>
        </Explorer>
      </div>

      <SectionHeading kicker="扩展点" title={GATEWAY_REGISTRY_NOTE.title} />
      <div className="mt-4 max-w-3xl rounded-lg border border-line bg-white p-6">
        <p className="text-sm leading-relaxed text-ink/75">{GATEWAY_REGISTRY_NOTE.body}</p>
        <ul className="mt-4 space-y-2">
          {GATEWAY_REGISTRY_NOTE.points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
              <span className="mt-0.5 text-acid">▸</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
