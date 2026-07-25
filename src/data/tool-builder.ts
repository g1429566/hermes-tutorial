// Chapter 19「加一个新工具」数据源：工具注册实验。
// 代码模板逐行对齐 hermes-agent/AGENTS.md「Adding New Tools」（509–555 行）：
// check_requirements + handler 返回 json.dumps + registry.register 完整签名；
// 「第二步把工具名加进 toolsets.py」也是 AGENTS.md 的明文要求（545 行：This step is required）。

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
  'Hermes 的工具就是一个 Python 函数加一次 registry.register()：schema 给模型看，handler 给运行时调，' +
  'check_fn 决定这个环境装不装得上它。但新手最常栽的跟头不在代码里——自动发现只是 import 了你的文件，' +
  '工具名不进 toolsets.py，agent 永远看不见它。下面左边定义工具，右边实时生成 tools/your_tool.py，' +
  '最后用「模拟调用」走一遍 handle_function_call 的 JSON 包装链路。';

export const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

export const DEFAULT_TOOL_FORM: ToolBuilderForm = {
  name: 'example_tool',
  toolset: 'example',
  description: '把输入文本原样回显，用来演示注册链路。',
  paramName: 'param',
  paramType: 'string',
  paramDescription: '要处理的输入文本。',
  requiresEnv: 'EXAMPLE_API_KEY',
};

// 工具名惯例：snake_case（与仓库 tools/*.py 里所有 registry.register(name=...) 一致）
export const TOOL_NAME_RE = /^[a-z][a-z0-9_]*$/;

// JSON Schema type → Python 参数注解
const PY_TYPES: Record<string, string> = {
  string: 'str',
  number: 'float',
  integer: 'int',
  boolean: 'bool',
  array: 'list',
  object: 'dict',
};

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

// 生成 tools/<name>.py：模板对齐 AGENTS.md 524–543 行，schema.parameters 按表单展开
export function buildToolCode(form: ToolBuilderForm): string {
  const f = sanitized(form);
  const pyType = PY_TYPES[f.paramType];
  const envCheck = f.requiresEnv ? `bool(os.getenv("${f.requiresEnv}"))` : 'True  # 无环境依赖';
  const requiresEnv = f.requiresEnv ? `["${f.requiresEnv}"]` : '[]';
  return `import json, os
from tools.registry import registry

def check_requirements() -> bool:
    return ${envCheck}

def ${f.name}(${f.paramName}: ${pyType}, task_id: str = None) -> str:
    return json.dumps({"success": True, "data": "..."})

registry.register(
    name="${f.name}",
    toolset="${f.toolset}",
    schema={
        "name": "${f.name}",
        "description": "${f.description}",
        "parameters": {
            "type": "object",
            "properties": {
                "${f.paramName}": {"type": "${f.paramType}", "description": "${f.paramDescription}"},
            },
            "required": ["${f.paramName}"],
        },
    },
    handler=lambda args, **kw: ${f.name}(${f.paramName}=args.get("${f.paramName}", ""), task_id=kw.get("task_id")),
    check_fn=check_requirements,
    requires_env=${requiresEnv},
)`;
}

// 第二步：toolsets.py 手动接线（AGENTS.md 545 行——自动发现不会替你暴露工具）
export function buildToolsetsCode(form: ToolBuilderForm): string {
  const f = sanitized(form);
  return `# toolsets.py —— 第二步，必须手动
# 方式一：加进 _HERMES_CORE_TOOLS（所有平台的默认 bundle 都继承它）
_HERMES_CORE_TOOLS = [
    ...,
    "${f.name}",
]

# 方式二：加进目标 toolset（按平台/场景启用）
TOOLSETS = {
    "${f.toolset}": [..., "${f.name}"],
    ...
}`;
}

export interface SimulatedCall {
  requestLine: string;
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
export function simulateToolCall(form: ToolBuilderForm): SimulatedCall {
  const f = sanitized(form);
  const args = { [f.paramName]: sampleValue(f.paramType) };
  const result = JSON.stringify({ success: true, data: { echo: args[f.paramName] } });
  return {
    requestLine: `handle_function_call("${f.name}", ${JSON.stringify(args)}, task_id)`,
    resultJson: result,
    toolMessageJson: JSON.stringify({ role: 'tool', name: f.name, content: result }, null, 2),
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
  'A Hermes tool is one Python function plus one registry.register() call: the schema is what the model sees, ' +
  'the handler is what the runtime invokes, and check_fn decides whether the tool can be installed in the current environment. ' +
  'But the most common beginner mistake is not in the code — auto-discovery only imports your file; ' +
  'unless the tool name goes into toolsets.py, the agent never sees it. Below, define the tool on the left, ' +
  'watch tools/your_tool.py generate live on the right, then walk the JSON wrapping chain of handle_function_call with a simulated call.';

export const DEFAULT_TOOL_FORM_EN: ToolBuilderForm = {
  name: 'example_tool',
  toolset: 'example',
  description: 'Echoes the input text to demonstrate the registration chain.',
  paramName: 'param',
  paramType: 'string',
  paramDescription: 'The input text to process.',
  requiresEnv: 'EXAMPLE_API_KEY',
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
    zh: '模板逐行对齐 AGENTS.md「Adding New Tools」；所有 handler 必须返回 JSON 字符串',
    en: 'Template matches AGENTS.md "Adding New Tools" line by line; every handler must return a JSON string',
  },
  simulateButton: { zh: '▶ 模拟调用一次', en: '▶ Simulate one call' },
  toolsetsKicker: { zh: '最容易漏的一步', en: 'The easiest step to miss' },
  toolsetsBody: {
    zh: '自动发现只负责 import 你的文件、把 schema 收进 registry；工具名不进 toolsets.py 的 TOOLSETS，agent 就永远看不见它。这一步没有自动 wiring——必须手动。',
    en: 'Auto-discovery only imports your file and collects the schema into the registry; unless the tool name goes into TOOLSETS in toolsets.py, the agent never sees it. There is no automatic wiring for this step — it must be done manually.',
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
    zh: '下面的沙箱代码 = 一个最小 registry stub（顶替真实的 tools/registry.py）+ 你刚写的工具文件 + 一次 handler 分发。点「运行」，在浏览器里的 CPython 中看注册信息和 handler 真实返回的 JSON 字符串——可以随手改代码再跑。',
    en: 'The sandbox code below = a minimal registry stub (standing in for the real tools/registry.py) + the tool file you just wrote + one handler dispatch. Hit "Run" to see the registration info and the JSON string the handler actually returns, in CPython running in your browser — feel free to tweak the code and run again.',
  },
  pyRunnerTitleSuffix: { zh: ' · Pyodide 沙箱', en: ' · Pyodide sandbox' },
  pyRunnerNote: {
    zh: '运行时：Pyodide（CPython WebAssembly），本地 vendored，完全离线',
    en: 'Runtime: Pyodide (CPython WebAssembly), vendored locally, fully offline',
  },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住加工具', en: 'Adding a tool in one sentence' },
  hookBody: {
    zh: 'import 即注册，toolset 才暴露；handler 永远返回 json.dumps。——文件会被自动发现， 但暴露给 agent 是你的手动决定。',
    en: 'Import registers, toolsets expose; handlers always return json.dumps. — Files are auto-discovered, but exposing them to the agent is your manual decision.',
  },
};
