// Chapter 20「加一个 Provider」数据源：Provider 适配实验。
// 统一接口四步与懒发现机制对齐 hermes-agent/AGENTS.md「Model-provider plugins」（815–838 行）、
// providers/__init__.py（_discover_providers 扫描顺序）与 providers/base.py（ProviderProfile 字段）；
// 代码模板对齐真实插件 plugins/model-providers/novita/__init__.py 与 deepseek/plugin.yaml。

export interface ProviderStep {
  id: string;
  label: string;
  title: string;
  body: string;
  code: { file: string; lines?: string; snippet: string; note?: string };
  points: string[];
}

export const PROVIDER_INTRO =
  '每个推理后端（openrouter / anthropic / gmi / deepseek …）都是一个 model-provider 插件：' +
  '一份 ProviderProfile 把认证、端点、模型目录、请求级怪癖声明在一处，传输层读 profile 而不是收 20 个布尔旗标。' +
  '先把统一接口的四个环节走一遍，再用表单生成你自己的 provider 插件骨架。';

export const PROVIDER_STEPS: ProviderStep[] = [
  {
    id: 'auth',
    label: 'AUTH',
    title: '认证：API key 与环境变量元数据',
    body: 'profile 用 env_vars 声明自己需要哪些密钥；用户侧的录入走 OPTIONAL_ENV_VARS——带元数据（description / prompt / url / password / category）注册后，hermes setup 的设置向导会自动把它列出来。铁律：.env 只放密钥，非密钥配置进 config.yaml。',
    code: {
      file: 'hermes_cli/config.py',
      lines: 'OPTIONAL_ENV_VARS',
      snippet: `"ACME_API_KEY": {
    "description": "What it's for",
    "prompt": "Display name",
    "url": "https://...",
    "password": True,
    "category": "provider",  # provider / tool / messaging / setting
},`,
      note: 'AGENTS.md「.env variables (SECRETS ONLY)」一节的元数据模板',
    },
    points: [
      'env_vars 是 tuple：("ACME_API_KEY",) 或 ("ACME_API_KEY", "ACME_BASE_URL")',
      'auth_type 默认 "api_key"，另有 oauth_device_code / oauth_external / aws_sdk 等',
      '非密钥配置（超时、旗标）属于 config.yaml，不进 .env',
    ],
  },
  {
    id: 'models',
    label: 'MODELS',
    title: '模型目录：实时拉取 + 兜底清单',
    body: 'pick 器优先实时拉取模型目录：models_url 缺省时回退到 {base_url}/models，fetch_models 带 hermes-cli/<version> 的 UA（有些 provider 的 WAF 会 403 掉默认的 Python-urllib UA）。拉取失败就退到 fallback_models——只放支持 tool calling 的 agentic 模型。',
    code: {
      file: 'providers/base.py',
      lines: 'ProviderProfile · 模型目录',
      snippet: `fallback_models: tuple = ()  # 实时拉取失败时 /model 选择器的兜底
models_url: str = ""           # 缺省回退 {base_url}/models
default_aux_model: str = ""    # 压缩/视觉等辅助任务的便宜模型`,
      note: 'hostname 缺省从 base_url 推导，用于 URL→provider 反查',
    },
    points: [
      '只有支持 tool calling 的模型才配进 fallback_models',
      'default_aux_model 给压缩、视觉等辅助调用一个便宜出口',
      'aliases 让 get_provider_profile("kimi") 也能命中规范名',
    ],
  },
  {
    id: 'call',
    label: 'CALL',
    title: '调用：统一成 chat.completions 形状',
    body: '主循环只认一种形状：client.chat.completions.create(model, messages, tools)。provider 适配层负责把各家 API 的方言翻译进来——声明式的 profile 覆盖端点与默认参数，prepare_messages / build_api_kwargs_extras 这类钩子处理请求级怪癖，比如 DeepSeek 要在 extra_body 里显式带 thinking 开关。',
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `response = client.chat.completions.create(
    model=model, messages=messages, tools=tool_schemas)
if response.tool_calls:
    ...  # 执行工具，继续循环
else:
    return response.content`,
      note: 'api_mode 默认 "chat_completions"；profile 是声明式的，不拥有 client 构造',
    },
    points: [
      '主循环完全同步——流式增量只在显示层处理',
      'fixed_temperature / default_max_tokens 处理请求级默认值',
      'DeepSeek 的 build_api_kwargs_extras：extra_body.thinking + reasoning_effort',
    ],
  },
  {
    id: 'events',
    label: 'EVENTS',
    title: '统一事件流：插件钩子与两种结局',
    body: '无论底层是哪个 provider，主循环只看到两种结局：tool_calls（继续循环）或 content（返回）。调用前后各有一对插件钩子——pre_llm_call / post_llm_call 在统一位置触发，插件做审计、改写、统计都不用认识具体 provider。',
    code: {
      file: 'run_agent.py + model_tools.py',
      lines: '生命周期钩子',
      snippet: `# pre_llm_call   —— 调用前：插件可审计/改写
# post_llm_call  —— 调用后：统一的结果后处理
# 两种结局：
#   response.tool_calls → handle_function_call → 循环继续
#   response.content    → return，会话收尾`,
      note: '钩子在 run_agent.py 触发；pre/post_tool_call 在 model_tools.py 触发',
    },
    points: [
      '钩子与 provider 解耦：写一个插件，惠及所有后端',
      'fallback_model 与 credential_pool 处理单点故障',
      'reasoning 内容统一存进 assistant_msg["reasoning"]',
    ],
  },
];

// ── Provider 插件生成 ─────────────────────────────────────────────

export interface ProviderForm {
  name: string; // 规范名，如 acme
  displayName: string; // "Acme AI"
  description: string;
  baseUrl: string; // https://api.acme.com/v1
  signupUrl: string;
  envVar: string; // ACME_API_KEY
  aliases: string; // 逗号分隔，可空
  models: string; // 逗号分隔的 fallback_models
}

export const DEFAULT_PROVIDER_FORM: ProviderForm = {
  name: 'acme',
  displayName: 'Acme AI',
  description: 'Acme AI — OpenAI-compatible inference API',
  baseUrl: 'https://api.acme.com/v1',
  signupUrl: 'https://acme.com/settings/keys',
  envVar: 'ACME_API_KEY',
  aliases: 'acme-ai',
  models: 'acme-large, acme-small',
};

function sanitized(form: ProviderForm): ProviderForm {
  return {
    name: form.name.trim() || 'acme',
    displayName: form.displayName.trim() || 'Acme AI',
    description: form.description.trim() || 'Acme AI provider',
    baseUrl: form.baseUrl.trim() || 'https://api.acme.com/v1',
    signupUrl: form.signupUrl.trim(),
    envVar: form.envVar.trim() || 'ACME_API_KEY',
    aliases: form.aliases.trim(),
    models: form.models.trim() || 'acme-large',
  };
}

function csv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// 生成 plugins/model-providers/<name>/__init__.py（形状对齐 novita 等真实插件）
export function buildProviderCode(form: ProviderForm): string {
  const f = sanitized(form);
  const varName = f.name.replace(/-/g, '_');
  const aliases = csv(f.aliases);
  const aliasLine =
    aliases.length > 0 ? `\n    aliases=(${aliases.map((a) => `"${a}"`).join(', ')}),` : '';
  const signupLine = f.signupUrl ? `\n    signup_url="${f.signupUrl}",` : '';
  const models = csv(f.models)
    .map((m) => `        "${m}",`)
    .join('\n');
  return `"""${f.displayName} provider profile."""

from providers import register_provider
from providers.base import ProviderProfile


${varName} = ProviderProfile(
    name="${f.name}",${aliasLine}
    display_name="${f.displayName}",
    description="${f.description}",${signupLine}
    env_vars=("${f.envVar}",),
    base_url="${f.baseUrl}",
    auth_type="api_key",
    fallback_models=(
${models}
    ),
)

register_provider(${varName})`;
}

// 同目录下的 plugin.yaml 清单（形状对齐 deepseek/plugin.yaml）
export function buildProviderYaml(form: ProviderForm): string {
  const f = sanitized(form);
  return `name: ${f.name}-provider
kind: model-provider
version: 1.0.0
description: ${f.displayName}
author: Your Name`;
}

// 懒发现机制（providers/__init__.py 的 _discover_providers + AGENTS.md 815–838 行）
export const DISCOVERY_ORDER = [
  {
    step: '1',
    where: '<repo>/plugins/model-providers/<name>/',
    what: 'bundled：随仓库发布的 profile',
  },
  {
    step: '2',
    where: '$HERMES_HOME/plugins/model-providers/<name>/',
    what: 'user：同名覆盖 bundled（last-writer-wins）',
  },
  {
    step: '3',
    where: '<repo>/providers/<name>.py',
    what: 'legacy：单文件 profile，向后兼容',
  },
];

export const DISCOVERY_POINTS = [
  '懒发现：首次 get_provider_profile() 或 list_providers() 调用才扫描导入——启动路径零成本',
  'register_provider() 是 last-writer-wins：user 插件同名覆盖 bundled，第三方不用打 repo 补丁就能换掉任何内置 profile',
  '通用 PluginManager 只记录 kind: model-provider 的 manifest，不 import——否则 ProviderProfile 会被实例化两次',
  '没写 kind: 的插件按源码启发式自动归类：__init__.py 里同时出现 register_provider + ProviderProfile',
];
