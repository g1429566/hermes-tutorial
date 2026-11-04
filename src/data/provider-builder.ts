// Chapter 20「加一个 Provider」数据源：Provider 适配实验。
// 统一接口四步与懒发现机制对齐 hermes-agent/plugins/AGENTS.md「Plugin kinds and their discovery
// systems」表（model-provider 行）、providers/__init__.py（_discover_providers 扫描顺序）与
// providers/base.py（ProviderProfile 字段）；
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
  '先建立认证、目录、请求与结果四个环节，再用表单观察 ProviderProfile。生成骨架只是开始，还需验证真实路径。';

export const PROVIDER_STEPS: ProviderStep[] = [
  {
    id: 'auth',
    label: 'AUTH',
    title: '认证：API key 与环境变量元数据',
    body: 'profile 用 env_vars 声明自己需要哪些密钥；用户侧的录入走 OPTIONAL_ENV_VARS——带元数据（description / prompt / url / password / category）注册后，hermes setup 的设置向导会自动把它列出来。铁律：.env 只放密钥，非密钥配置进 config.yaml。',
    code: {
      file: 'hermes_cli/config_defaults.py',
      lines: 'OPTIONAL_ENV_VARS',
      snippet:
        '"ACME_API_KEY": {\n    "description": "What it\'s for",\n    "prompt": "Display name",\n    "url": "https://...",\n    "password": True,\n    "category": "provider",  # provider / tool / skill / messaging / setting\n},',
      note: '根 AGENTS.md「.env is for secrets only」铁律（Contribution Rubric）对应的元数据模板',
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
      snippet:
        'fallback_models: tuple = ()  # 实时拉取失败时 /model 选择器的兜底\nmodels_url: str = ""           # 缺省回退 {base_url}/models\ndefault_aux_model: str = ""    # 压缩/视觉等辅助任务的便宜模型',
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
    title: '适配 provider 的请求与结果',
    body: '声明与传输适配共同处理认证、消息、工具、流式和结果。Chat Completions 是常见路径之一，真实运行也有 Responses、Anthropic Messages 等路径。',
    code: {
      file: 'agent/turn_api_call.py',
      lines: '教学伪代码',
      snippet: 'response = request_selected_transport(messages, tools)',
      note: '示意调用边界，不表示所有 provider 共用一个 SDK 方法。',
    },
    points: ['至少验证一次真实工具调用与结果回传。', '流式在请求层处理，界面负责显示。'],
  },
  {
    id: 'events',
    label: 'EVENTS',
    title: '统一事件流：插件钩子与两种结局',
    body: '公共生命周期接入可以观察不同 provider 的调用。文本、工具调用、中断与失败要分别处理，不能把所有响应强行缩成两种成功结局。',
    code: {
      file: 'agent/turn_context.py + turn_finalizer.py + model_tools.py',
      lines: '生命周期钩子',
      snippet:
        '# pre_llm_call   —— 调用前：插件可审计/改写\n# post_llm_call  —— 调用后：统一的结果后处理\n# 两种结局：\n#   response.tool_calls → handle_function_call → 循环继续\n#   response.content    → return，会话收尾',
      note: 'pre_llm_call 在 turn_context.py、post_llm_call 在 turn_finalizer.py 触发；pre/post_tool_call 在 model_tools.py 触发',
    },
    points: ['按实际 API 模式与能力要求核对。', '请求成功不等于用户任务已经验收。'],
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

// 懒发现机制（providers/__init__.py 的 _discover_providers + plugins/AGENTS.md 的 model-provider 行）
export const DISCOVERY_ORDER = [
  {
    step: '1',
    where: '<repo>/plugins/model-providers/<name>/',
    what: 'bundled：随仓库发布的 profile（进程级扫描第 1 步）',
  },
  {
    step: '2',
    where: '$HERMES_HOME/plugins/model-providers/<name>/',
    what: 'user：查询时按 home 懒装载，同名覆盖 bundled',
  },
  {
    step: '3',
    where: '<repo>/providers/<name>.py',
    what: 'legacy：单文件 profile，向后兼容（进程级扫描最后一步）',
  },
];

export const DISCOVERY_POINTS = [
  '懒发现：首次 get_provider_profile() 或 list_providers() 调用才扫描导入——启动路径零成本',
  'register_provider() 是 last-writer-wins：user 插件同名覆盖 bundled，第三方不用打 repo 补丁就能换掉任何内置 profile',
  '通用 PluginManager 只记录 kind: model-provider 的 manifest，不 import——否则 ProviderProfile 会被实例化两次',
  '没写 kind: 的插件按源码启发式自动归类：__init__.py 里同时出现 register_provider + ProviderProfile',
  'pip 安装的 provider（entry points）优先级最低：要在 plugins.enabled 白名单内才装载，同名 bundled/user 总会覆盖它',
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const PROVIDER_INTRO_EN =
  'Trace authentication, catalogs, requests, and results before exploring ProviderProfile. Generated scaffolding still needs real integration checks.';

export const PROVIDER_STEPS_EN: ProviderStep[] = [
  {
    id: 'auth',
    label: 'AUTH',
    title: 'Auth: API keys and env-var metadata',
    body: 'The profile declares which secrets it needs via env_vars; user-side entry goes through OPTIONAL_ENV_VARS — once registered with metadata (description / prompt / url / password / category), the hermes setup wizard lists it automatically. Iron rule: .env holds secrets only; non-secret config goes into config.yaml.',
    code: {
      file: 'hermes_cli/config_defaults.py',
      lines: 'OPTIONAL_ENV_VARS',
      snippet:
        '"ACME_API_KEY": {\n    "description": "What it\'s for",\n    "prompt": "Display name",\n    "url": "https://...",\n    "password": True,\n    "category": "provider",  # provider / tool / skill / messaging / setting\n},',
      note: 'Metadata template for the root AGENTS.md ".env is for secrets only" rule (Contribution Rubric)',
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
      snippet:
        'fallback_models: tuple = ()  # 实时拉取失败时 /model 选择器的兜底\nmodels_url: str = ""           # 缺省回退 {base_url}/models\ndefault_aux_model: str = ""    # 压缩/视觉等辅助任务的便宜模型',
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
    title: 'Adapt the provider API',
    body: 'Provider metadata and transport adapters connect authentication, messages, tools, streaming, and results. Chat Completions is one common shape; Responses and Anthropic Messages are separate supported paths.',
    code: {
      file: 'agent/turn_api_call.py',
      lines: 'Teaching pseudocode',
      snippet: 'response = request_selected_transport(messages, tools)',
      note: 'Illustrates a boundary, not one universal SDK call.',
    },
    points: [
      'Verify a tool call and its result, not only text.',
      'Streaming is handled in the request layer as well as the UI.',
    ],
  },
  {
    id: 'events',
    label: 'EVENTS',
    title: 'Unified event flow: plugin hooks and two outcomes',
    body: 'Shared lifecycle integration observes model work across provider-specific routes. Text, tool calls, cancellation, and failures need distinct handling.',
    code: {
      file: 'agent/turn_context.py + turn_finalizer.py + model_tools.py',
      lines: '生命周期钩子',
      snippet:
        '# pre_llm_call   —— 调用前：插件可审计/改写\n# post_llm_call  —— 调用后：统一的结果后处理\n# 两种结局：\n#   response.tool_calls → handle_function_call → 循环继续\n#   response.content    → return，会话收尾',
      note: 'pre_llm_call fires in turn_context.py and post_llm_call in turn_finalizer.py; pre/post_tool_call fire in model_tools.py',
    },
    points: [
      'Check the actual API mode and capability requirements.',
      'A successful response is not task-level acceptance.',
    ],
  },
];

export const DISCOVERY_ORDER_EN: typeof DISCOVERY_ORDER = [
  {
    step: '1',
    where: '<repo>/plugins/model-providers/<name>/',
    what: 'bundled: profiles shipped with the repo (process-wide scan, step 1)',
  },
  {
    step: '2',
    where: '$HERMES_HOME/plugins/model-providers/<name>/',
    what: 'user: loaded lazily per home at lookup time, overriding bundled same-name profiles',
  },
  {
    step: '3',
    where: '<repo>/providers/<name>.py',
    what: 'legacy: single-file profiles, kept for backward compatibility (last step of the process-wide scan)',
  },
];

export const DISCOVERY_POINTS_EN: typeof DISCOVERY_POINTS = [
  'Lazy discovery: scanning and importing happen on the first get_provider_profile() or list_providers() call — zero cost on the startup path',
  'register_provider() is last-writer-wins: a same-named user plugin overrides the bundled one, so third parties can replace any built-in profile without patching the repo',
  'The generic PluginManager only records manifests of kind: model-provider without importing them — otherwise the ProviderProfile would be instantiated twice',
  'Plugins without a kind: field are auto-classified by source heuristic: register_provider + ProviderProfile both appear in __init__.py',
  'Pip-installed providers (entry points) have the lowest precedence: they load only when named in the plugins.enabled allow-list, and a same-named bundled/user profile always overrides them',
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
    zh: '_discover_providers() 不在启动时跑——第一次调用 get_provider_profile() 或 list_providers() 时才扫描并 import（bundled 插件目录、legacy 单文件，外加优先级最低的 pip entry points），import 触发模块级的 register_provider()；$HERMES_HOME 的 user 插件不走这个扫描，而是查询时按 home 懒装载、同名覆盖 bundled。',
    en: '_discover_providers() does not run at startup — on the first call to get_provider_profile() or list_providers() it scans and imports (the bundled plugin dir, legacy single-file profiles, plus pip entry points at the lowest precedence), and the import triggers the module-level register_provider(); $HERMES_HOME user plugins are not part of this scan — they load lazily per home at lookup time, overriding bundled same-name profiles.',
  },
  hookKicker: { zh: '要点回顾', en: 'Key idea' },
  hookTitle: { zh: '一句话记住 provider 插件', en: 'Provider plugins in one sentence' },
  hookBody: {
    zh: '一份声明式的 ProviderProfile + 一次 register_provider()——懒发现会找到你， 同名 user 覆盖 bundled，后写者胜。',
    en: 'One declarative ProviderProfile + one register_provider() — lazy discovery will find you; same-named user overrides bundled, last writer wins.',
  },
};
