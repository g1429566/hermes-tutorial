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

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const PROVIDER_INTRO_EN =
  'Every inference backend (openrouter / anthropic / gmi / deepseek …) is a model-provider plugin: ' +
  'a single ProviderProfile declares auth, endpoint, model catalog, and request-level quirks in one place, ' +
  'so the transport layer reads a profile instead of juggling 20 boolean flags. ' +
  'Walk the four stages of the unified interface first, then use the form to generate your own provider plugin skeleton.';

export const PROVIDER_STEPS_EN: ProviderStep[] = [
  {
    id: 'auth',
    label: 'AUTH',
    title: 'Auth: API keys and env-var metadata',
    body: 'The profile declares which secrets it needs via env_vars; user-side entry goes through OPTIONAL_ENV_VARS — once registered with metadata (description / prompt / url / password / category), the hermes setup wizard lists it automatically. Iron rule: .env holds secrets only; non-secret config goes into config.yaml.',
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
      note: 'Metadata template from the AGENTS.md ".env variables (SECRETS ONLY)" section',
    },
    points: [
      'env_vars is a tuple: ("ACME_API_KEY",) or ("ACME_API_KEY", "ACME_BASE_URL")',
      'auth_type defaults to "api_key"; oauth_device_code / oauth_external / aws_sdk also exist',
      'Non-secret config (timeouts, flags) belongs in config.yaml, not .env',
    ],
  },
  {
    id: 'models',
    label: 'MODELS',
    title: 'Model catalog: live fetch + fallback list',
    body: "The picker prefers a live model catalog: when models_url is absent it falls back to {base_url}/models, and fetch_models sends a hermes-cli/<version> UA (some providers' WAFs 403 the default Python-urllib UA). If the fetch fails it falls back to fallback_models — agentic models with tool calling support only.",
    code: {
      file: 'providers/base.py',
      lines: 'ProviderProfile · 模型目录',
      snippet: `fallback_models: tuple = ()  # 实时拉取失败时 /model 选择器的兜底
models_url: str = ""           # 缺省回退 {base_url}/models
default_aux_model: str = ""    # 压缩/视觉等辅助任务的便宜模型`,
      note: 'hostname is derived from base_url by default, used for URL→provider reverse lookup',
    },
    points: [
      'Only models with tool calling support belong in fallback_models',
      'default_aux_model gives compression, vision, and other aux calls a cheap outlet',
      'aliases let get_provider_profile("kimi") hit the canonical name too',
    ],
  },
  {
    id: 'call',
    label: 'CALL',
    title: 'Calling: unified into the chat.completions shape',
    body: "The agent loop speaks exactly one shape: client.chat.completions.create(model, messages, tools). The provider adapter layer translates each vendor's API dialect into it — the declarative profile covers endpoints and default parameters, while hooks like prepare_messages / build_api_kwargs_extras handle request-level quirks, e.g. DeepSeek needs an explicit thinking switch in extra_body.",
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `response = client.chat.completions.create(
    model=model, messages=messages, tools=tool_schemas)
if response.tool_calls:
    ...  # 执行工具，继续循环
else:
    return response.content`,
      note: 'api_mode defaults to "chat_completions"; the profile is declarative and does not own client construction',
    },
    points: [
      'The agent loop is fully synchronous — streaming deltas are handled only in the display layer',
      'fixed_temperature / default_max_tokens handle request-level defaults',
      "DeepSeek's build_api_kwargs_extras: extra_body.thinking + reasoning_effort",
    ],
  },
  {
    id: 'events',
    label: 'EVENTS',
    title: 'Unified event flow: plugin hooks and two outcomes',
    body: 'No matter which provider sits underneath, the agent loop sees only two outcomes: tool_calls (loop continues) or content (return). A pair of plugin hooks flanks each call — pre_llm_call / post_llm_call fire at unified points, so plugins can audit, rewrite, and meter without knowing any specific provider.',
    code: {
      file: 'run_agent.py + model_tools.py',
      lines: '生命周期钩子',
      snippet: `# pre_llm_call   —— 调用前：插件可审计/改写
# post_llm_call  —— 调用后：统一的结果后处理
# 两种结局：
#   response.tool_calls → handle_function_call → 循环继续
#   response.content    → return，会话收尾`,
      note: 'Hooks fire in run_agent.py; pre/post_tool_call fire in model_tools.py',
    },
    points: [
      'Hooks are decoupled from providers: write one plugin, benefit every backend',
      'fallback_model and the credential pool handle single points of failure',
      'Reasoning content is uniformly stored in assistant_msg["reasoning"]',
    ],
  },
];

export const DISCOVERY_ORDER_EN: typeof DISCOVERY_ORDER = [
  {
    step: '1',
    where: '<repo>/plugins/model-providers/<name>/',
    what: 'bundled: profiles shipped with the repo',
  },
  {
    step: '2',
    where: '$HERMES_HOME/plugins/model-providers/<name>/',
    what: 'user: same-name override of bundled (last-writer-wins)',
  },
  {
    step: '3',
    where: '<repo>/providers/<name>.py',
    what: 'legacy: single-file profiles, kept for backward compatibility',
  },
];

export const DISCOVERY_POINTS_EN: typeof DISCOVERY_POINTS = [
  'Lazy discovery: scanning and importing happen on the first get_provider_profile() or list_providers() call — zero cost on the startup path',
  'register_provider() is last-writer-wins: a same-named user plugin overrides the bundled one, so third parties can replace any built-in profile without patching the repo',
  'The generic PluginManager only records manifests of kind: model-provider without importing them — otherwise the ProviderProfile would be instantiated twice',
  'Plugins without a kind: field are auto-classified by source heuristic: register_provider + ProviderProfile both appear in __init__.py',
];

// 本章专属 UI 文案（步进器标题、表单标签、发现机制段落等）
export const PROVIDER_UI = {
  stepsKicker: { zh: '统一接口', en: 'Unified interface' },
  stepsTitle: { zh: '四个环节，一种形状', en: 'Four stages, one shape' },
  formKicker: { zh: '动手', en: 'Hands-on' },
  formTitle: { zh: '生成你的 provider 插件骨架', en: 'Generate your provider plugin skeleton' },
  nameLabel: { zh: 'name · 规范名', en: 'name · canonical name' },
  descLabel: { zh: 'description · 选择器副标题', en: 'description · picker subtitle' },
  envLabel: { zh: 'env_vars · API key 变量名', en: 'env_vars · API key variable name' },
  signupLabel: { zh: 'signup_url · 可留空', en: 'signup_url · optional' },
  aliasesLabel: { zh: 'aliases · 逗号分隔，可留空', en: 'aliases · comma-separated, optional' },
  modelsLabel: {
    zh: 'fallback_models · 逗号分隔，只放支持 tool calling 的模型',
    en: 'fallback_models · comma-separated, tool-calling models only',
  },
  initNote: {
    zh: 'import 即注册：模块加载时调用 register_provider(ProviderProfile(...))',
    en: 'Import is registration: register_provider(ProviderProfile(...)) runs at module load',
  },
  yamlNote: {
    zh: 'kind: model-provider——通用 PluginManager 只记录 manifest，不 import',
    en: 'kind: model-provider — the generic PluginManager records the manifest only, no import',
  },
  discoveryKicker: { zh: '发现机制', en: 'Discovery' },
  discoveryTitle: { zh: '懒发现：第一次用到才扫描', en: 'Lazy discovery: scanned on first use' },
  discoveryBody: {
    zh: '_discover_providers() 不在启动时跑——第一次调用 get_provider_profile() 或 list_providers() 时才扫描三个位置并 import 每个插件，import 触发模块级的 register_provider()。',
    en: '_discover_providers() does not run at startup — on the first call to get_provider_profile() or list_providers() it scans three locations and imports each plugin, and the import triggers the module-level register_provider().',
  },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住 provider 插件', en: 'Provider plugins in one sentence' },
  hookBody: {
    zh: '一份声明式的 ProviderProfile + 一次 register_provider()——懒发现会找到你， 同名 user 覆盖 bundled，后写者胜。',
    en: 'One declarative ProviderProfile + one register_provider() — lazy discovery will find you; same-named user overrides bundled, last writer wins.',
  },
};
