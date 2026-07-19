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
