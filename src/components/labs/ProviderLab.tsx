'use client';

import { useState } from 'react';
import {
  DEFAULT_PROVIDER_FORM,
  DISCOVERY_ORDER,
  DISCOVERY_POINTS,
  PROVIDER_INTRO,
  PROVIDER_STEPS,
  buildProviderCode,
  buildProviderYaml,
  type ProviderForm,
} from '@/data/provider-builder';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { CodeBlock, SectionHeading, Stepper } from './primitives';

const LAB_KEY = 'lab:provider';

interface ProviderLabState {
  step: string;
  form: ProviderForm;
}

// 从 labResults 恢复快照；形状不对就回退默认值。
function restore(saved: unknown): ProviderLabState {
  const fallback = { step: PROVIDER_STEPS[0].id, form: DEFAULT_PROVIDER_FORM };
  if (!saved || typeof saved !== 'object') return fallback;
  const s = saved as Record<string, unknown>;
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  const step =
    typeof s.step === 'string' && PROVIDER_STEPS.some((p) => p.id === s.step)
      ? s.step
      : PROVIDER_STEPS[0].id;
  return {
    step,
    form: {
      name: str(s.name, DEFAULT_PROVIDER_FORM.name),
      displayName: str(s.displayName, DEFAULT_PROVIDER_FORM.displayName),
      description: str(s.description, DEFAULT_PROVIDER_FORM.description),
      baseUrl: str(s.baseUrl, DEFAULT_PROVIDER_FORM.baseUrl),
      signupUrl: str(s.signupUrl, DEFAULT_PROVIDER_FORM.signupUrl),
      envVar: str(s.envVar, DEFAULT_PROVIDER_FORM.envVar),
      aliases: str(s.aliases, DEFAULT_PROVIDER_FORM.aliases),
      models: str(s.models, DEFAULT_PROVIDER_FORM.models),
    },
  };
}

const labelCls = 'block font-mono text-[11px] tracking-[0.15em] text-muted';
const inputCls =
  'mt-1.5 w-full rounded border border-line bg-white px-3 py-2 font-mono text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none';

// Chapter 20「加一个 Provider」：Provider 适配实验。
// ① 统一接口四步步进器；② 表单生成 model-provider 插件骨架；③ 懒发现机制讲解。
export default function ProviderLab() {
  const progress = useProgress();
  const [state, setState] = useState<ProviderLabState>(() => restore(progress.labResults[LAB_KEY]));
  const { step: stepId, form } = state;

  const step = PROVIDER_STEPS.find((s) => s.id === stepId) ?? PROVIDER_STEPS[0];
  const idx = PROVIDER_STEPS.findIndex((s) => s.id === step.id);

  function update(next: ProviderLabState) {
    setState(next);
    setLabResult(LAB_KEY, { step: next.step, ...next.form });
  }

  function select(id: string) {
    update({ step: id, form });
  }

  function setForm(next: ProviderForm) {
    update({ step: stepId, form: next });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{PROVIDER_INTRO}</p>

      <SectionHeading kicker="统一接口" title="四个环节，一种形状" />
      <div className="mt-6">
        <Stepper
          steps={PROVIDER_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={select}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
            STEP {idx + 1}/4 · {step.label}
          </p>
          <h3 className="mt-2 font-serif text-2xl">{step.title}</h3>
          <p className="mt-3 leading-relaxed text-ink/75">{step.body}</p>
          <div className="mt-5">
            <CodeBlock
              file={step.code.file}
              lines={step.code.lines}
              code={step.code.snippet}
              note={step.code.note}
            />
          </div>
        </div>
        <div className="space-y-4">
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
          <div className="flex gap-2">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => select(PROVIDER_STEPS[idx - 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              ‹ 上一步
            </button>
            <button
              type="button"
              disabled={idx === PROVIDER_STEPS.length - 1}
              onClick={() => select(PROVIDER_STEPS[idx + 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              下一步 ›
            </button>
          </div>
        </div>
      </div>

      <SectionHeading kicker="动手" title="生成你的 provider 插件骨架" />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="space-y-5 rounded-lg border border-line bg-paper-deep p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="pv-name">
                name · 规范名
              </label>
              <input
                id="pv-name"
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="acme"
                spellCheck={false}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pv-display">
                display_name
              </label>
              <input
                id="pv-display"
                className={inputCls}
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Acme AI"
                spellCheck={false}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="pv-desc">
              description · 选择器副标题
            </label>
            <input
              id="pv-desc"
              className={inputCls}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Acme AI — OpenAI-compatible inference API"
              spellCheck={false}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="pv-base">
                base_url
              </label>
              <input
                id="pv-base"
                className={inputCls}
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.acme.com/v1"
                spellCheck={false}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pv-env">
                env_vars · API key 变量名
              </label>
              <input
                id="pv-env"
                className={inputCls}
                value={form.envVar}
                onChange={(e) => setForm({ ...form, envVar: e.target.value })}
                placeholder="ACME_API_KEY"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="pv-signup">
                signup_url · 可留空
              </label>
              <input
                id="pv-signup"
                className={inputCls}
                value={form.signupUrl}
                onChange={(e) => setForm({ ...form, signupUrl: e.target.value })}
                placeholder="https://acme.com/settings/keys"
                spellCheck={false}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pv-aliases">
                aliases · 逗号分隔，可留空
              </label>
              <input
                id="pv-aliases"
                className={inputCls}
                value={form.aliases}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                placeholder="acme-ai"
                spellCheck={false}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="pv-models">
              fallback_models · 逗号分隔，只放支持 tool calling 的模型
            </label>
            <input
              id="pv-models"
              className={inputCls}
              value={form.models}
              onChange={(e) => setForm({ ...form, models: e.target.value })}
              placeholder="acme-large, acme-small"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="space-y-4">
          <CodeBlock
            file={`plugins/model-providers/${form.name.trim() || 'acme'}/__init__.py`}
            code={buildProviderCode(form)}
            note="import 即注册：模块加载时调用 register_provider(ProviderProfile(...))"
          />
          <CodeBlock
            file={`plugins/model-providers/${form.name.trim() || 'acme'}/plugin.yaml`}
            code={buildProviderYaml(form)}
            note="kind: model-provider——通用 PluginManager 只记录 manifest，不 import"
          />
        </div>
      </div>

      <SectionHeading kicker="发现机制" title="懒发现：第一次用到才扫描" />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        <code className="font-mono text-ember">_discover_providers()</code> 不在启动时跑——第一次调用{' '}
        <code className="font-mono text-ember">get_provider_profile()</code> 或{' '}
        <code className="font-mono text-ember">list_providers()</code> 时才扫描三个位置并 import
        每个插件，import 触发模块级的 register_provider()。
      </p>
      <ol className="mt-5 max-w-3xl space-y-2">
        {DISCOVERY_ORDER.map((d) => (
          <li
            key={d.step}
            className="flex items-baseline gap-4 rounded-lg border border-line bg-white px-4 py-3"
          >
            <span className="font-mono text-xs text-muted">{d.step}</span>
            <div>
              <p className="font-mono text-sm text-ink">{d.where}</p>
              <p className="mt-0.5 text-xs text-muted">{d.what}</p>
            </div>
          </li>
        ))}
      </ol>
      <ul className="mt-5 max-w-3xl space-y-2.5">
        {DISCOVERY_POINTS.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
            <span className="mt-0.5 text-acid">▸</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <SectionHeading kicker="记忆钩子" title="一句话记住 provider 插件" />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        一份声明式的 ProviderProfile + 一次 register_provider()——懒发现会找到你， 同名 user 覆盖
        bundled，后写者胜。
      </p>
    </section>
  );
}
