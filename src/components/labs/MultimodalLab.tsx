'use client';

import { useState } from 'react';
import { MODALITIES, MULTIMODAL_INTRO, UNIFIED_SURFACE } from '@/data/multimodal';
import { Explorer, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 31「多模态工具」：模态浏览器 + image_generate 统一接口路由演示。
export default function MultimodalLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:multimodal'];
  const savedState =
    saved && typeof saved === 'object'
      ? (saved as { modality?: unknown; route?: unknown })
      : undefined;
  const [modalityId, setModalityId] = useState(
    typeof savedState?.modality === 'string' ? savedState.modality : MODALITIES[0].id,
  );
  const [routeId, setRouteId] = useState(
    typeof savedState?.route === 'string' ? savedState.route : UNIFIED_SURFACE.routes[0].id,
  );

  const modality = MODALITIES.find((m) => m.id === modalityId) ?? MODALITIES[0];
  const route = UNIFIED_SURFACE.routes.find((r) => r.id === routeId) ?? UNIFIED_SURFACE.routes[0];

  function pickModality(id: string) {
    setModalityId(id);
    setLabResult('lab:multimodal', { modality: id, route: routeId });
  }
  function pickRoute(id: string) {
    setRouteId(id);
    setLabResult('lab:multimodal', { modality: modalityId, route: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{MULTIMODAL_INTRO}</p>

      <div className="mt-8">
        <Explorer
          items={MODALITIES.map((m) => ({ id: m.id, name: m.name, tagline: m.tagline }))}
          current={modality.id}
          onChange={pickModality}
        >
          <div className="rounded-lg border border-ink/20 bg-code-bg p-6 text-white md:p-8">
            <p className="font-mono text-[11px] tracking-[0.15em] text-acid">
              MODALITY · {modality.id.toUpperCase()}
            </p>
            <h3 className="mt-2 font-serif text-2xl md:text-3xl">{modality.name}</h3>
            <p className="mt-1 font-mono text-sm text-ember">工具：{modality.tool}</p>
            <p className="mt-4 leading-relaxed text-white/75">{modality.architecture}</p>
            <ul className="mt-5 space-y-1.5">
              {modality.notes.map((n) => (
                <li key={n} className="flex items-start gap-2.5 text-sm text-white/85">
                  <span className="mt-0.5 text-acid">▸</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-white/10 pt-4 font-mono text-xs text-white/50">
              <p>
                配置：<span className="text-ember">{modality.configKey}</span>
              </p>
              <p className="mt-1">
                源码：<span className="text-blue">{modality.sourceRef}</span>
              </p>
            </div>
          </div>
        </Explorer>
      </div>

      <SectionHeading kicker="统一接口" title="一个工具，两种路由" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/75">
        <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-[13px] text-ember">
          {UNIFIED_SURFACE.tool}
        </code>{' '}
        ——有没有源图决定一切。切换条件看看路由怎么变：
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {UNIFIED_SURFACE.routes.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => pickRoute(r.id)}
            className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
              r.id === route.id
                ? 'border-ink bg-ink text-acid'
                : 'border-line bg-white text-ink/70 hover:border-muted'
            }`}
          >
            {r.condition}
          </button>
        ))}
      </div>
      <div className="mt-4 max-w-3xl rounded-lg border border-line bg-white p-5">
        <p className="font-mono text-sm">
          → 路由到 <span className="text-ember">{route.route}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/75">{route.desc}</p>
      </div>
    </section>
  );
}
