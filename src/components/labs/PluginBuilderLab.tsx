'use client';

import { useState } from 'react';
import {
  buildPluginInit,
  buildPluginYaml,
  CAPABILITY_POINTS,
  CAPABILITY_POINTS_EN,
  DEFAULT_PLUGIN_FORM,
  LIFECYCLE_HOOKS,
  LIFECYCLE_HOOKS_EN,
  PLUGIN_DISCOVERY_PITFALL,
  PLUGIN_DISCOVERY_PITFALL_EN,
  PLUGIN_INTRO,
  PLUGIN_INTRO_EN,
  PLUGIN_IRON_RULE,
  PLUGIN_IRON_RULE_EN,
  PLUGIN_NAME_RE,
  PLUGIN_UI,
  type PluginForm,
} from '@/data/plugin-builder';
import { CodeBlock, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';

// Chapter 21「写一个 Plugin」：Plugin 构建器。
// 勾选扩展点 → plugin.yaml 与 __init__.py 的 register(ctx) 实时生长；
// 铁律与发现时机坑单独醒目展示。表单状态持久化到 labResults。
export default function PluginBuilderLab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? PLUGIN_INTRO_EN : PLUGIN_INTRO;
  const hooks = lang === 'en' ? LIFECYCLE_HOOKS_EN : LIFECYCLE_HOOKS;
  const capabilities = lang === 'en' ? CAPABILITY_POINTS_EN : CAPABILITY_POINTS;
  const redLines =
    lang === 'en'
      ? [PLUGIN_IRON_RULE_EN, PLUGIN_DISCOVERY_PITFALL_EN]
      : [PLUGIN_IRON_RULE, PLUGIN_DISCOVERY_PITFALL];
  const progress = useProgress();
  const saved = progress.labResults['lab:plugin-builder'];
  const [form, setForm] = useState<PluginForm>(() => {
    if (saved && typeof saved === 'object') {
      const s = saved as Partial<PluginForm>;
      if (typeof s.name === 'string' && Array.isArray(s.selected)) {
        return { name: s.name, selected: s.selected.filter((x) => typeof x === 'string') };
      }
    }
    return DEFAULT_PLUGIN_FORM;
  });

  function update(next: PluginForm) {
    setForm(next);
    setLabResult('lab:plugin-builder', next);
  }

  function togglePoint(id: string) {
    update({
      ...form,
      selected: form.selected.includes(id)
        ? form.selected.filter((x) => x !== id)
        : [...form.selected, id],
    });
  }

  const nameValid = PLUGIN_NAME_RE.test(form.name.trim());

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
              {pick(lang, PLUGIN_UI.nameLabel)}
            </p>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update({ ...form, name: e.target.value })}
              spellCheck={false}
              className="mt-2 w-full rounded border border-line px-3 py-2 font-mono text-sm focus:border-ink focus:outline-none"
            />
            {!nameValid && (
              <p className="mt-2 font-mono text-xs text-red">{pick(lang, PLUGIN_UI.nameError)}</p>
            )}
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
              {pick(lang, PLUGIN_UI.hooksLabel)}
            </p>
            <ul className="mt-3 space-y-2">
              {hooks.map((h) => (
                <li key={h.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.selected.includes(h.id)}
                      onChange={() => togglePoint(h.id)}
                      className="mt-0.5 accent-[#65a30d]"
                    />
                    <span>
                      <code className="font-mono text-[13px] text-ember">{h.id}</code>
                      <span className="ml-1.5 text-ink/65">{h.desc}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
              {pick(lang, PLUGIN_UI.capsLabel)}
            </p>
            <ul className="mt-3 space-y-2">
              {capabilities.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.selected.includes(c.id)}
                      onChange={() => togglePoint(c.id)}
                      className="mt-0.5 accent-[#65a30d]"
                    />
                    <span>
                      <code className="font-mono text-[13px] text-ember">{c.label}</code>
                      <span className="ml-1.5 text-ink/65">{c.desc}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <CodeBlock
            file={`~/.hermes/plugins/${form.name.trim() || 'my-plugin'}/plugin.yaml`}
            code={buildPluginYaml(form)}
          />
          <CodeBlock
            file={`~/.hermes/plugins/${form.name.trim() || 'my-plugin'}/__init__.py`}
            code={buildPluginInit(form)}
            note={pick(lang, PLUGIN_UI.initNote)}
          />
        </div>
      </div>

      <SectionHeading
        kicker={pick(lang, PLUGIN_UI.rulesKicker)}
        title={pick(lang, PLUGIN_UI.rulesTitle)}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {redLines.map((r) => (
          <div key={r.title} className="rounded-lg border border-ember/40 bg-ember/5 p-5">
            <p className="font-mono text-sm text-ember">⚠ {r.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
