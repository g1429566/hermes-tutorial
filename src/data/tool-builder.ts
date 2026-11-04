export interface ToolBuilderForm {
  name: string; // snake_case
  toolset: string;
  description: string;
  paramName: string;
  paramType: string; // JSON Schema type
  paramDescription: string;
  requiresEnv: string; // 环境变量名；留空 = 无环境依赖
}

export const TOOL_BUILDER_INTRO =
  '下面做一个回显工具，把收到的参数原样放进结果。先填写工具名与参数说明，观察注册代码中的 schema 如何描述输入，再用一组样例比较模拟结果与 Python 处理器的输出。';

export const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

export const DEFAULT_TOOL_FORM: ToolBuilderForm = {
  name: 'example_tool',
  toolset: 'example',
  description: '把输入文本原样回显，用来演示注册链路。',
  paramName: 'param',
  paramType: 'string',
  paramDescription: '要处理的输入文本。',
  requiresEnv: '',
};

// 工具名惯例：snake_case（与仓库 tools/*.py 里所有 registry.register(name=...) 一致）
export const TOOL_NAME_RE = /^[a-z][a-z0-9_]*$/;

function sanitized(form: ToolBuilderForm): ToolBuilderForm {
  return {
    name: form.name.trim() || 'example_tool',
    toolset: form.toolset.trim() || 'example',
    description: form.description.trim() || '...',
    paramName: form.paramName.trim() || 'param',
    paramType: PARAM_TYPES.includes(form.paramType) ? form.paramType : 'string',
    paramDescription: form.paramDescription.trim() || '...',
    requiresEnv: form.requiresEnv.trim(),
  };
}

// 生成 tools/<name>.py：模板对齐 tools/AGENTS.md「Adding a core tool」注册示例，schema.parameters 按表单展开
export function buildToolCode(form: ToolBuilderForm): string {
  const f = sanitized(form);
  const name = JSON.stringify(f.name);
  const param = JSON.stringify(f.paramName);
  const envCheck = f.requiresEnv ? `bool(get_secret(${JSON.stringify(f.requiresEnv)}))` : 'True';
  return `import json
${f.requiresEnv ? 'from agent.secret_scope import get_secret\n' : ''}from tools.registry import registry

def check_requirements() -> bool:
    return ${envCheck}

def handle(args: dict, **kwargs) -> str:
    value = args[${param}]
    return json.dumps({"success": True, "data": {"echo": value}}, ensure_ascii=False)

registry.register(
    name=${name},
    toolset=${JSON.stringify(f.toolset)},
    schema={
        "name": ${name},
        "description": ${JSON.stringify(f.description)},
        "parameters": {
            "type": "object",
            "properties": {
                ${param}: {"type": ${JSON.stringify(f.paramType)}, "description": ${JSON.stringify(f.paramDescription)}},
            },
            "required": [${param}],
        },
    },
    handler=handle,
    check_fn=check_requirements,
    requires_env=${JSON.stringify(f.requiresEnv ? [f.requiresEnv] : [])},
)`;
}

export function buildToolsetsCode(form: ToolBuilderForm): string {
  const f = sanitized(form);
  return `${JSON.stringify(f.toolset)}: {
    "description": ${JSON.stringify(f.description)},
    "tools": [${JSON.stringify(f.name)}],
    "includes": [],
},`;
}

export interface SimulatedCall {
  requestLine: string;
  argsPython: string;
  resultJson: string;
  toolMessageJson: string;
}

function sampleValue(paramType: string): unknown {
  switch (paramType) {
    case 'number':
      return 3.14;
    case 'integer':
      return 42;
    case 'boolean':
      return true;
    case 'array':
      return ['a', 'b'];
    case 'object':
      return { key: 'value' };
    default:
      return '示例输入';
  }
}

// 伪造一次 handle_function_call：registry 分发 → handler 执行 → JSON 字符串 → role="tool" 消息
export function simulateToolCall(form: ToolBuilderForm, lang: 'zh' | 'en' = 'zh'): SimulatedCall {
  const f = sanitized(form);
  const sample =
    f.paramType === 'string' && lang === 'en' ? 'Sample input' : sampleValue(f.paramType);
  const argsPython = `{${JSON.stringify(f.paramName)}: ${sample === true ? 'True' : JSON.stringify(sample)}}`;
  const result = JSON.stringify({ success: true, data: { echo: sample } });
  return {
    argsPython,
    requestLine: `handle_function_call(${JSON.stringify(f.name)}, ${argsPython}, tool_call_id="call_1")`,
    resultJson: result,
    toolMessageJson: JSON.stringify(
      { role: 'tool', tool_call_id: 'call_1', name: f.name, content: result },
      null,
      2,
    ),
  };
}

// 模拟调用面板里展示的包装步骤（对应 model_tools.py 的真实链路）
export const CALL_STEPS = [
  'registry 按 name 查到 schema 与 handler',
  'check_fn(check_requirements) 通过，工具在当前环境可用',
  'pre_tool_call 插件钩子触发（可审计/拦截参数）',
  'handler(args, task_id=...) 执行你的 Python 函数',
  '返回值必须是 JSON 字符串——registry 统一包装错误',
  '结果以 role="tool" 消息 append 进 messages，循环继续',
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const TOOL_BUILDER_INTRO_EN =
  'Build an echo tool that returns the input it receives. Enter a name and parameter description, see how the registered schema describes that input, then compare one simulated result with the Python handler output.';

export const DEFAULT_TOOL_FORM_EN: ToolBuilderForm = {
  name: 'example_tool',
  toolset: 'example',
  description: 'Echoes the input text to demonstrate the registration chain.',
  paramName: 'param',
  paramType: 'string',
  paramDescription: 'The input text to process.',
  requiresEnv: '',
};

export const CALL_STEPS_EN: typeof CALL_STEPS = [
  'registry looks up the schema and handler by name',
  'check_fn (check_requirements) passes — the tool is available in this environment',
  'The pre_tool_call plugin hook fires (can audit/intercept arguments)',
  'handler(args, task_id=...) executes your Python function',
  'The return value must be a JSON string — registry wraps errors uniformly',
  'The result is appended to messages as a role="tool" message and the loop continues',
];

// 本章专属 UI 文案（表单标签、提醒段、PyRunner 标题等）
export const TOOL_BUILDER_UI = {
  nameLabel: { zh: '工具名 · snake_case', en: 'Tool name · snake_case' },
  nameError: {
    zh: '工具名必须是小写开头的 snake_case（如 web_extract）。',
    en: 'Tool name must be snake_case starting with a lowercase letter (e.g. web_extract).',
  },
  envLabel: { zh: 'requires_env · 可留空', en: 'requires_env · optional' },
  descLabel: {
    zh: 'description · 模型靠它决定何时调用',
    en: 'description · the model uses it to decide when to call',
  },
  descPlaceholder: { zh: '这个工具做什么。', en: 'What this tool does.' },
  paramGroupLabel: { zh: '一个参数', en: 'One parameter' },
  paramNameLabel: { zh: '参数名', en: 'Name' },
  paramTypeLabel: { zh: '类型', en: 'Type' },
  paramDescLabel: { zh: '参数描述', en: 'Description' },
  paramDescPlaceholder: { zh: '这个参数是干什么的。', en: 'What this parameter is for.' },
  previewNote: {
    zh: 'schema 描述请求，handle 读取指定字段并返回 JSON 字符串。',
    en: 'The schema describes the request. The handler reads the named field and returns a JSON string.',
  },
  simulateButton: { zh: '▶ 模拟调用一次', en: '▶ Simulate one call' },
  toolsetsKicker: { zh: '最容易漏的一步', en: 'The easiest step to miss' },
  toolsetsBody: {
    zh: '本例演示内置工具。要新增静态工具组，把下面这一项放入 toolsets.py 已有的 TOOLSETS 字典。如果目标组已经存在，只把新工具名加到它的 tools 列表中。会话启用该工具组、运行环境满足要求后，模型才可使用它。',
    en: 'For this built-in example, insert this entry inside the existing TOOLSETS dictionary in toolsets.py to define a new static toolset. For an existing group, append the tool name to its tools list. Enable that group and satisfy the environment requirements to use the tool in a session.',
  },
  simKicker: { zh: '模拟调用', en: 'Simulated call' },
  simTitle: {
    zh: 'handle_function_call 的包装链路',
    en: 'The wrapping chain of handle_function_call',
  },
  dispatchFile: { zh: 'model_tools.py · 分发入口', en: 'model_tools.py · dispatch entry' },
  resultFileSuffix: { zh: '() 返回值', en: '() return value' },
  resultNote: {
    zh: 'handler 返回的是 JSON 字符串，不是 dict',
    en: 'The handler returns a JSON string, not a dict',
  },
  toolMessageFile: {
    zh: 'append 进 messages 的 tool 消息',
    en: 'The tool message appended to messages',
  },
  toolMessageNote: {
    zh: '追加不改写——prompt cache 因此保持有效',
    en: 'Append, never rewrite — this keeps the prompt cache valid',
  },
  runKicker: { zh: '真实运行', en: 'Run for real' },
  runTitle: {
    zh: '不止模拟——在浏览器里真跑一次',
    en: 'Beyond simulation — actually run it in the browser',
  },
  runBody: {
    zh: '点击「运行」，浏览器内的 Python 会注册上方的工具、检查环境条件，再传入和模拟相同的参数。这里用一个小对象记录注册信息，凭据查询统一返回教学占位值。比较两处输出中的 echo 字段。',
    en: 'Click Run to register the generated tool in browser Python, check its requirements, and pass it the same argument as the simulation. A small object records registration and the credential lookup returns a teaching placeholder. Compare the echo field in both outputs.',
  },
  pyRunnerTitleSuffix: { zh: ' · Pyodide 沙箱', en: ' · Pyodide sandbox' },
  pyRunnerNote: {
    zh: '运行时：Pyodide（CPython WebAssembly），本地 vendored，完全离线',
    en: 'Runtime: Pyodide (CPython WebAssembly), vendored locally, fully offline',
  },
  hookKicker: { zh: '要点回顾', en: 'Key idea' },
  hookTitle: { zh: '一句话记住加工具', en: 'Adding a tool in one sentence' },
  hookBody: {
    zh: '注册记录工具名称、参数和处理器。启用的工具组与环境条件决定模型可以调用哪些工具。',
    en: 'Registration records the name, parameters, and handler. Enabled toolsets and environment checks determine which tools are available.',
  },
};
