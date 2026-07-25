'use client';

import { useState } from 'react';
import {
  CALL_STEPS,
  CALL_STEPS_EN,
  DEFAULT_TOOL_FORM,
  DEFAULT_TOOL_FORM_EN,
  PARAM_TYPES,
  TOOL_BUILDER_INTRO,
  TOOL_BUILDER_INTRO_EN,
  TOOL_BUILDER_UI,
  TOOL_NAME_RE,
  buildToolCode,
  buildToolsetsCode,
  simulateToolCall,
  type ToolBuilderForm,
} from '@/data/tool-builder';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';
import { CodeBlock, SectionHeading } from './primitives';
import PyRunner from '../PyRunner';

const LAB_KEY = 'lab:tool-builder';

interface ToolLabState {
  form: ToolBuilderForm;
  simulated: boolean;
}

// 从 labResults 恢复快照；形状不对就回退默认值。
function restore(saved: unknown, defaults: ToolBuilderForm): ToolLabState {
  const fallback = { form: defaults, simulated: false };
  if (!saved || typeof saved !== 'object') return fallback;
  const s = saved as Record<string, unknown>;
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  return {
    form: {
      name: str(s.name, defaults.name),
      toolset: str(s.toolset, defaults.toolset),
      description: str(s.description, defaults.description),
      paramName: str(s.paramName, defaults.paramName),
      paramType: PARAM_TYPES.includes(s.paramType as string)
        ? (s.paramType as string)
        : defaults.paramType,
      paramDescription: str(s.paramDescription, defaults.paramDescription),
      requiresEnv: str(s.requiresEnv, defaults.requiresEnv),
    },
    simulated: s.simulated === true,
  };
}

const labelCls = 'block font-mono text-[11px] tracking-[0.15em] text-muted';
const inputCls =
  'mt-1.5 w-full rounded border border-line bg-white px-3 py-2 font-mono text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none';

// Chapter 19「加一个新工具」：工具注册实验。
// 左：工具定义表单；右：tools/your_tool.py 实时预览；下方：toolsets.py 提醒 + 模拟调用。
export default function ToolBuilderLab() {
  const { lang } = useLang();
  const defaults = lang === 'en' ? DEFAULT_TOOL_FORM_EN : DEFAULT_TOOL_FORM;
  const intro = lang === 'en' ? TOOL_BUILDER_INTRO_EN : TOOL_BUILDER_INTRO;
  const callSteps = lang === 'en' ? CALL_STEPS_EN : CALL_STEPS;
  const progress = useProgress();
  const [state, setState] = useState<ToolLabState>(() =>
    restore(progress.labResults[LAB_KEY], defaults),
  );
  const { form, simulated } = state;

  const nameOk = TOOL_NAME_RE.test(form.name.trim());
  const call = simulated ? simulateToolCall(form) : null;

  // 沙箱代码：最小 registry stub + 生成的工具文件 + 一次 handler 分发（Pyodide 真跑）
  const safeParam = /^\w+$/.test(form.paramName.trim()) ? form.paramName.trim() : 'param';
  const sandboxCode = [
    'import sys, types, json',
    '',
    '# ① 沙箱 stub：顶替真实的 tools/registry.py',
    '_calls = []',
    'class _Registry:',
    '    def register(self, **kw):',
    '        _calls.append(kw)',
    '_mod = types.ModuleType("tools.registry")',
    '_mod.registry = _Registry()',
    'sys.modules["tools"] = types.ModuleType("tools")',
    'sys.modules["tools.registry"] = _mod',
    '',
    '# ② 你的工具文件（与右侧预览一致）',
    buildToolCode(form),
    '',
    '# ③ 模拟 handle_function_call 的一次分发',
    '_call = _calls[-1]',
    'print("注册成功:", _call["name"], "→ toolset:", _call["toolset"])',
    `_result = _call["handler"]({${JSON.stringify(safeParam)}: "示例输入"})`,
    'print("handler 返回（JSON 字符串）:")',
    'print(_result)',
  ].join('\n');

  function update(next: ToolLabState) {
    setState(next);
    setLabResult(LAB_KEY, { ...next.form, simulated: next.simulated });
  }

  function setForm(next: ToolBuilderForm) {
    update({ form: next, simulated });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {/* ── 左：工具定义表单 ── */}
        <div className="space-y-5 rounded-lg border border-line bg-paper-deep p-6">
          <div>
            <label className={labelCls} htmlFor="tb-name">
              {pick(lang, TOOL_BUILDER_UI.nameLabel)}
            </label>
            <input
              id="tb-name"
              className={`${inputCls} ${nameOk ? '' : 'border-red'}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="example_tool"
              spellCheck={false}
            />
            {!nameOk && (
              <p className="mt-1 text-xs text-red">{pick(lang, TOOL_BUILDER_UI.nameError)}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="tb-toolset">
                toolset
              </label>
              <input
                id="tb-toolset"
                className={inputCls}
                value={form.toolset}
                onChange={(e) => setForm({ ...form, toolset: e.target.value })}
                placeholder="example"
                spellCheck={false}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="tb-env">
                {pick(lang, TOOL_BUILDER_UI.envLabel)}
              </label>
              <input
                id="tb-env"
                className={inputCls}
                value={form.requiresEnv}
                onChange={(e) => setForm({ ...form, requiresEnv: e.target.value })}
                placeholder="EXAMPLE_API_KEY"
                spellCheck={false}
              />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="tb-desc">
              {pick(lang, TOOL_BUILDER_UI.descLabel)}
            </label>
            <textarea
              id="tb-desc"
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={pick(lang, TOOL_BUILDER_UI.descPlaceholder)}
            />
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <p className={labelCls}>{pick(lang, TOOL_BUILDER_UI.paramGroupLabel)}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]">
              <div>
                <label className={labelCls} htmlFor="tb-pname">
                  {pick(lang, TOOL_BUILDER_UI.paramNameLabel)}
                </label>
                <input
                  id="tb-pname"
                  className={inputCls}
                  value={form.paramName}
                  onChange={(e) => setForm({ ...form, paramName: e.target.value })}
                  placeholder="param"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="tb-ptype">
                  {pick(lang, TOOL_BUILDER_UI.paramTypeLabel)}
                </label>
                <select
                  id="tb-ptype"
                  className={inputCls}
                  value={form.paramType}
                  onChange={(e) => setForm({ ...form, paramType: e.target.value })}
                >
                  {PARAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls} htmlFor="tb-pdesc">
                {pick(lang, TOOL_BUILDER_UI.paramDescLabel)}
              </label>
              <input
                id="tb-pdesc"
                className={inputCls}
                value={form.paramDescription}
                onChange={(e) => setForm({ ...form, paramDescription: e.target.value })}
                placeholder={pick(lang, TOOL_BUILDER_UI.paramDescPlaceholder)}
              />
            </div>
          </div>
        </div>

        {/* ── 右：代码预览 ── */}
        <div className="space-y-4">
          <CodeBlock
            file={`tools/${form.name.trim() || 'example_tool'}.py`}
            code={buildToolCode(form)}
            note={pick(lang, TOOL_BUILDER_UI.previewNote)}
          />
          <button
            type="button"
            onClick={() => update({ form, simulated: true })}
            className="rounded bg-ink px-5 py-2.5 font-mono text-sm text-acid transition-colors hover:bg-ink/90"
          >
            {pick(lang, TOOL_BUILDER_UI.simulateButton)}
          </button>
        </div>
      </div>

      {/* ── 第二步提醒：toolsets.py 手动接线 ── */}
      <div className="mt-6 rounded-lg border border-ember bg-ember/10 p-5">
        <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
          {pick(lang, TOOL_BUILDER_UI.toolsetsKicker)}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/85">
          {pick(lang, TOOL_BUILDER_UI.toolsetsBody)}
        </p>
        <div className="mt-4">
          <CodeBlock file="toolsets.py" code={buildToolsetsCode(form)} />
        </div>
      </div>

      {/* ── 模拟调用结果 ── */}
      {call && (
        <>
          <SectionHeading
            kicker={pick(lang, TOOL_BUILDER_UI.simKicker)}
            title={pick(lang, TOOL_BUILDER_UI.simTitle)}
          />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <ol className="space-y-2">
              {callSteps.map((s, i) => (
                <li
                  key={s}
                  className="flex items-baseline gap-3 rounded-lg border border-line bg-white px-4 py-3"
                >
                  <span className="font-mono text-xs text-acid">{'①②③④⑤⑥'[i]}</span>
                  <span className="text-sm text-ink/80">{s}</span>
                </li>
              ))}
            </ol>
            <div className="space-y-4">
              <CodeBlock file={pick(lang, TOOL_BUILDER_UI.dispatchFile)} code={call.requestLine} />
              <CodeBlock
                file={`${form.name.trim() || 'example_tool'}${pick(lang, TOOL_BUILDER_UI.resultFileSuffix)}`}
                code={call.resultJson}
                note={pick(lang, TOOL_BUILDER_UI.resultNote)}
              />
              <CodeBlock
                file={pick(lang, TOOL_BUILDER_UI.toolMessageFile)}
                code={call.toolMessageJson}
                note={pick(lang, TOOL_BUILDER_UI.toolMessageNote)}
              />
            </div>
          </div>
        </>
      )}

      <SectionHeading
        kicker={pick(lang, TOOL_BUILDER_UI.runKicker)}
        title={pick(lang, TOOL_BUILDER_UI.runTitle)}
      />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/75">
        {pick(lang, TOOL_BUILDER_UI.runBody)}
      </p>
      <div className="mt-4 max-w-4xl">
        <PyRunner
          key={sandboxCode}
          title={`tools/${form.name.trim() || 'example_tool'}.py${pick(lang, TOOL_BUILDER_UI.pyRunnerTitleSuffix)}`}
          initialCode={sandboxCode}
          note={pick(lang, TOOL_BUILDER_UI.pyRunnerNote)}
        />
      </div>

      <SectionHeading
        kicker={pick(lang, TOOL_BUILDER_UI.hookKicker)}
        title={pick(lang, TOOL_BUILDER_UI.hookTitle)}
      />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {pick(lang, TOOL_BUILDER_UI.hookBody)}
      </p>
    </section>
  );
}
