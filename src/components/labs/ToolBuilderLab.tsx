'use client';

import { useState } from 'react';
import {
  CALL_STEPS,
  DEFAULT_TOOL_FORM,
  PARAM_TYPES,
  TOOL_BUILDER_INTRO,
  TOOL_NAME_RE,
  buildToolCode,
  buildToolsetsCode,
  simulateToolCall,
  type ToolBuilderForm,
} from '@/data/tool-builder';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { CodeBlock, SectionHeading } from './primitives';
import PyRunner from '../PyRunner';

const LAB_KEY = 'lab:tool-builder';

interface ToolLabState {
  form: ToolBuilderForm;
  simulated: boolean;
}

// 从 labResults 恢复快照；形状不对就回退默认值。
function restore(saved: unknown): ToolLabState {
  const fallback = { form: DEFAULT_TOOL_FORM, simulated: false };
  if (!saved || typeof saved !== 'object') return fallback;
  const s = saved as Record<string, unknown>;
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  return {
    form: {
      name: str(s.name, DEFAULT_TOOL_FORM.name),
      toolset: str(s.toolset, DEFAULT_TOOL_FORM.toolset),
      description: str(s.description, DEFAULT_TOOL_FORM.description),
      paramName: str(s.paramName, DEFAULT_TOOL_FORM.paramName),
      paramType: PARAM_TYPES.includes(s.paramType as string)
        ? (s.paramType as string)
        : DEFAULT_TOOL_FORM.paramType,
      paramDescription: str(s.paramDescription, DEFAULT_TOOL_FORM.paramDescription),
      requiresEnv: str(s.requiresEnv, DEFAULT_TOOL_FORM.requiresEnv),
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
  const progress = useProgress();
  const [state, setState] = useState<ToolLabState>(() => restore(progress.labResults[LAB_KEY]));
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
      <p className="max-w-3xl leading-relaxed text-ink/75">{TOOL_BUILDER_INTRO}</p>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {/* ── 左：工具定义表单 ── */}
        <div className="space-y-5 rounded-lg border border-line bg-paper-deep p-6">
          <div>
            <label className={labelCls} htmlFor="tb-name">
              工具名 · snake_case
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
              <p className="mt-1 text-xs text-red">
                工具名必须是小写开头的 snake_case（如 web_extract）。
              </p>
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
                requires_env · 可留空
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
              description · 模型靠它决定何时调用
            </label>
            <textarea
              id="tb-desc"
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="这个工具做什么。"
            />
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <p className={labelCls}>一个参数</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]">
              <div>
                <label className={labelCls} htmlFor="tb-pname">
                  参数名
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
                  类型
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
                参数描述
              </label>
              <input
                id="tb-pdesc"
                className={inputCls}
                value={form.paramDescription}
                onChange={(e) => setForm({ ...form, paramDescription: e.target.value })}
                placeholder="这个参数是干什么的。"
              />
            </div>
          </div>
        </div>

        {/* ── 右：代码预览 ── */}
        <div className="space-y-4">
          <CodeBlock
            file={`tools/${form.name.trim() || 'example_tool'}.py`}
            code={buildToolCode(form)}
            note="模板逐行对齐 AGENTS.md「Adding New Tools」；所有 handler 必须返回 JSON 字符串"
          />
          <button
            type="button"
            onClick={() => update({ form, simulated: true })}
            className="rounded bg-ink px-5 py-2.5 font-mono text-sm text-acid transition-colors hover:bg-ink/90"
          >
            ▶ 模拟调用一次
          </button>
        </div>
      </div>

      {/* ── 第二步提醒：toolsets.py 手动接线 ── */}
      <div className="mt-6 rounded-lg border border-ember bg-ember/10 p-5">
        <p className="font-mono text-[11px] tracking-[0.15em] text-ember">最容易漏的一步</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/85">
          自动发现只负责 import 你的文件、把 schema 收进 registry；工具名不进{' '}
          <code className="font-mono text-ember">toolsets.py</code> 的{' '}
          <code className="font-mono text-ember">TOOLSETS</code>，agent 就永远看不见它。
          这一步没有自动 wiring——必须手动。
        </p>
        <div className="mt-4">
          <CodeBlock file="toolsets.py" code={buildToolsetsCode(form)} />
        </div>
      </div>

      {/* ── 模拟调用结果 ── */}
      {call && (
        <>
          <SectionHeading kicker="模拟调用" title="handle_function_call 的包装链路" />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <ol className="space-y-2">
              {CALL_STEPS.map((s, i) => (
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
              <CodeBlock file="model_tools.py · 分发入口" code={call.requestLine} />
              <CodeBlock
                file={`${form.name.trim() || 'example_tool'}() 返回值`}
                code={call.resultJson}
                note="handler 返回的是 JSON 字符串，不是 dict"
              />
              <CodeBlock
                file="append 进 messages 的 tool 消息"
                code={call.toolMessageJson}
                note="追加不改写——prompt cache 因此保持有效"
              />
            </div>
          </div>
        </>
      )}

      <SectionHeading kicker="真实运行" title="不止模拟——在浏览器里真跑一次" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/75">
        下面的沙箱代码 = 一个最小 registry stub（顶替真实的 tools/registry.py）+ 你刚写的工具文件 +
        一次 handler 分发。点「运行」，在浏览器里的 CPython 中看注册信息和 handler 真实返回的 JSON
        字符串——可以随手改代码再跑。
      </p>
      <div className="mt-4 max-w-4xl">
        <PyRunner
          key={sandboxCode}
          title={`tools/${form.name.trim() || 'example_tool'}.py · Pyodide 沙箱`}
          initialCode={sandboxCode}
          note="运行时：Pyodide（CPython WebAssembly），本地 vendored，完全离线"
        />
      </div>

      <SectionHeading kicker="记忆钩子" title="一句话记住加工具" />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        import 即注册，toolset 才暴露；handler 永远返回 json.dumps。——文件会被自动发现， 但暴露给
        agent 是你的手动决定。
      </p>
    </section>
  );
}
