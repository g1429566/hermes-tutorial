'use client';

import { useState } from 'react';
import {
  MEMORY_HOOK,
  MEMORY_HOOK_EN,
  MEMORY_INTRO,
  MEMORY_INTRO_EN,
  MEMORY_LAYERS,
  MEMORY_LAYERS_EN,
  MEMORY_UI,
} from '@/data/memory';
import { CompareSelect, DetailPanel, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { pick, useLang } from '@/lib/i18n';

// Chapter 08「记忆与跨会话召回」：四层记忆架构图。
// 四层卡片切换：Working / Episodic / Semantic / Procedural，
// 每层展开生命周期、存什么、何时写、何时读、Hermes 实现（真实文件路径）、注意事项。
export default function MemoryLab() {
  const { lang } = useLang();
  const layers = lang === 'en' ? MEMORY_LAYERS_EN : MEMORY_LAYERS;
  const progress = useProgress();
  const saved = progress.labResults['lab:memory'];
  const initial =
    saved && typeof saved === 'object' && 'layer' in saved && typeof saved.layer === 'string'
      ? saved.layer
      : layers[0].id;
  const [layerId, setLayerId] = useState(initial);

  const layer = layers.find((l) => l.id === layerId) ?? layers[0];

  function select(id: string) {
    setLayerId(id);
    setLabResult('lab:memory', { layer: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">
        {lang === 'en' ? MEMORY_INTRO_EN : MEMORY_INTRO}
      </p>

      <div className="mt-8">
        <CompareSelect
          options={layers.map((l) => ({
            id: l.id,
            name: `${l.latin} · ${l.name}`,
            tagline: l.tagline,
          }))}
          current={layer.id}
          onChange={select}
        >
          <DetailPanel kicker={`LAYER · ${layer.latin.toUpperCase()}`} title={layer.name}>
            <p className="mt-4 leading-relaxed text-white/75">{layer.lifecycle}</p>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-mono text-xs tracking-[0.15em] text-white/50">
                  {pick(lang, MEMORY_UI.stores)}
                </h4>
                <ul className="mt-2.5 space-y-1.5">
                  {layer.stores.map((s) => (
                    <li key={s} className="flex items-start gap-2.5 text-sm text-white/85">
                      <span className="mt-0.5 text-acid">▸</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-5">
                <div>
                  <h4 className="font-mono text-xs tracking-[0.15em] text-white/50">
                    {pick(lang, MEMORY_UI.writes)}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">{layer.writes}</p>
                </div>
                <div>
                  <h4 className="font-mono text-xs tracking-[0.15em] text-white/50">
                    {pick(lang, MEMORY_UI.reads)}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">{layer.reads}</p>
                </div>
              </div>
            </div>

            <h4 className="mt-8 font-mono text-xs tracking-[0.15em] text-white/50">
              {pick(lang, MEMORY_UI.impl)}
            </h4>
            <ul className="mt-2.5 space-y-2">
              {layer.impl.map((f) => (
                <li key={f.path} className="text-sm">
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-ember">
                    {f.path}
                  </code>
                  <span className="ml-2 text-white/65">{f.note}</span>
                </li>
              ))}
            </ul>

            <h4 className="mt-8 font-mono text-xs tracking-[0.15em] text-white/50">
              {pick(lang, MEMORY_UI.cautions)}
            </h4>
            <ul className="mt-2.5 space-y-1.5">
              {layer.cautions.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-sm text-white/85">
                  <span className="mt-0.5 text-ember">!</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
        </CompareSelect>
      </div>

      <SectionHeading
        kicker={pick(lang, MEMORY_UI.hookKicker)}
        title={pick(lang, MEMORY_UI.hookTitle)}
      />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {lang === 'en' ? MEMORY_HOOK_EN : MEMORY_HOOK}
      </p>
    </section>
  );
}
