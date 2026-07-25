// Chapter 21「写一个 Plugin」数据源：Plugin 构建器。
// 扩展面与铁律对齐 hermes-agent/AGENTS.md「Plugins」（735–784 行）；
// 生成的 plugin.yaml / __init__.py 形状对齐真实插件 plugins/disk-cleanup/，
// ctx API 签名对齐 hermes_cli/plugins.py 的 PluginContext。

export interface PluginForm {
  name: string; // kebab-case 插件名
  selected: string[]; // 扩展点 id：6 个钩子名 + register_tool + register_cli_command
}

export const PLUGIN_INTRO =
  '通用插件是 Hermes 最宽松的扩展面：一个 plugin.yaml 清单，一个带 register(ctx) 的 __init__.py，' +
  '就能往六个生命周期钩子上挂回调、注册新工具、挂载 CLI 子命令——全程不碰核心文件。' +
  '下面勾选你的插件要的扩展点，右侧两个文件会实时长出来。';

// 六个生命周期钩子（AGENTS.md 747–749 行；触发位置：model_tools.py / run_agent.py）
export const LIFECYCLE_HOOKS = [
  { id: 'pre_tool_call', desc: '工具调用前：参数审计/拦截（model_tools.py 触发）' },
  { id: 'post_tool_call', desc: '工具调用后：结果后处理（model_tools.py 触发）' },
  { id: 'pre_llm_call', desc: '模型调用前（run_agent.py 触发）' },
  { id: 'post_llm_call', desc: '模型调用后（run_agent.py 触发）' },
  { id: 'on_session_start', desc: '会话开始（run_agent.py 触发）' },
  { id: 'on_session_end', desc: '会话结束：记忆同步、清理等（run_agent.py 触发）' },
];

// 钩子之外的两个 ctx 扩展能力
export const CAPABILITY_POINTS = [
  {
    id: 'register_tool',
    label: 'ctx.register_tool(...)',
    desc: '注册新工具——插件 toolset 自动被发现、可启停，不动 tools/ 与 toolsets.py',
  },
  {
    id: 'register_cli_command',
    label: 'ctx.register_cli_command(...)',
    desc: '注册 CLI 子命令——hermes <plugin> <subcmd> 开箱即用，不改 main.py',
  },
];

export const DEFAULT_PLUGIN_FORM: PluginForm = {
  name: 'my-plugin',
  selected: ['post_tool_call', 'on_session_end'],
};

export const PLUGIN_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 铁律（AGENTS.md 779–784 行，Teknium, May 2026）
export const PLUGIN_IRON_RULE = {
  title: '铁律：插件不得修改核心文件',
  body:
    'run_agent.py、cli.py、gateway/run.py、hermes_cli/main.py 这些核心文件，插件一行都不许动。' +
    '缺能力就扩展通用插件面——新钩子、新 ctx 方法——绝不把插件特有逻辑硬编码进核心。' +
    'PR #5295 曾为此从 main.py 删掉 95 行硬编码的 honcho argparse。',
};

// 时机坑（AGENTS.md 755–759 行）
export const PLUGIN_DISCOVERY_PITFALL = {
  title: '时机坑：discover_plugins() 是 import 副作用',
  body:
    'discover_plugins() 只作为 import model_tools.py 的副作用运行。' +
    '任何「没先 import model_tools.py 就读插件状态」的代码路径，都必须显式调用 discover_plugins()——' +
    '它是幂等的，显式调用零代价。',
};

function pluginName(form: PluginForm): string {
  return form.name.trim() || 'my-plugin';
}

// 生成 plugin.yaml（形状对齐 disk-cleanup/plugin.yaml）
export function buildPluginYaml(form: PluginForm): string {
  const name = pluginName(form);
  const hooks = LIFECYCLE_HOOKS.filter((h) => form.selected.includes(h.id));
  const lines = [
    `name: ${name}`,
    'version: 0.1.0',
    'description: "一句话说明这个插件做什么。"',
    'author: "Your Name"',
  ];
  if (hooks.length > 0) {
    lines.push('hooks:');
    for (const h of hooks) lines.push(`  - ${h.id}`);
  }
  return lines.join('\n');
}

// 钩子回调骨架：pre/post_tool_call 对齐 disk-cleanup 的真实签名，其余用 **kw 兜底
function hookCallback(hook: string): string {
  if (hook === 'pre_tool_call' || hook === 'post_tool_call') {
    return `def _on_${hook}(tool_name="", args=None, result=None, task_id="", session_id="", **_):
    """${hook}：审计 / 后处理工具调用。"""
    pass`;
  }
  if (hook === 'on_session_start' || hook === 'on_session_end') {
    return `def _on_${hook}(session_id="", **_):
    """${hook}。"""
    pass`;
  }
  return `def _on_${hook}(**kw):
    """${hook}。"""
    pass`;
}

// 生成 __init__.py：register(ctx) 随勾选实时增长（形状对齐 disk-cleanup/__init__.py）
export function buildPluginInit(form: PluginForm): string {
  const name = pluginName(form);
  const varName = name.replace(/-/g, '_');
  const hooks = LIFECYCLE_HOOKS.filter((h) => form.selected.includes(h.id));
  const withTool = form.selected.includes('register_tool');
  const withCli = form.selected.includes('register_cli_command');

  const chunks: string[] = [`"""${name} plugin."""\n\nimport json`];

  for (const h of hooks) chunks.push(hookCallback(h.id));

  if (withTool) {
    chunks.push(`def _${varName}_handler(args, **kw):
    return json.dumps({"success": True, "data": "..."})`);
  }

  if (withCli) {
    chunks.push(`def _setup_cli(subparser):
    subparser.add_argument("--verbose", action="store_true")


def _handle_cli(args):
    print("hello from ${name}")`);
  }

  const body: string[] = [];
  for (const h of hooks) body.push(`    ctx.register_hook("${h.id}", _on_${h.id})`);
  if (withTool) {
    body.push(`    ctx.register_tool(
        name="${varName}_tool",
        toolset="${name}",
        schema={
            "name": "${varName}_tool",
            "description": "插件注册的工具。",
            "parameters": {"type": "object", "properties": {}},
        },
        handler=_${varName}_handler,
    )`);
  }
  if (withCli) {
    body.push(`    ctx.register_cli_command(
        name="${name}",
        help="${name} 插件的命令组",
        setup_fn=_setup_cli,
        handler_fn=_handle_cli,
    )`);
  }

  const registerFn =
    body.length > 0
      ? `def register(ctx) -> None:\n${body.join('\n')}`
      : 'def register(ctx) -> None:\n    pass  # 勾选一个扩展点，这里就会长出来';
  chunks.push(registerFn);

  return chunks.join('\n\n\n');
}

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const PLUGIN_INTRO_EN =
  'Generic plugins are the most permissive extension surface in Hermes: a plugin.yaml manifest plus ' +
  'an __init__.py with register(ctx) lets you attach callbacks to six lifecycle hooks, register new tools, ' +
  'and mount CLI subcommands — all without touching core files. ' +
  'Check the extension points your plugin needs below, and the two files on the right grow in real time.';

export const LIFECYCLE_HOOKS_EN: typeof LIFECYCLE_HOOKS = [
  {
    id: 'pre_tool_call',
    desc: 'Before a tool call: audit/intercept arguments (fires in model_tools.py)',
  },
  {
    id: 'post_tool_call',
    desc: 'After a tool call: result post-processing (fires in model_tools.py)',
  },
  { id: 'pre_llm_call', desc: 'Before a model call (fires in run_agent.py)' },
  { id: 'post_llm_call', desc: 'After a model call (fires in run_agent.py)' },
  { id: 'on_session_start', desc: 'Session start (fires in run_agent.py)' },
  { id: 'on_session_end', desc: 'Session end: memory sync, cleanup, etc. (fires in run_agent.py)' },
];

export const CAPABILITY_POINTS_EN: typeof CAPABILITY_POINTS = [
  {
    id: 'register_tool',
    label: 'ctx.register_tool(...)',
    desc: 'Register a new tool — the plugin toolset is auto-discovered and can be toggled, without touching tools/ or toolsets.py',
  },
  {
    id: 'register_cli_command',
    label: 'ctx.register_cli_command(...)',
    desc: 'Register a CLI subcommand — hermes <plugin> <subcmd> works out of the box, no changes to main.py',
  },
];

export const PLUGIN_IRON_RULE_EN: typeof PLUGIN_IRON_RULE = {
  title: 'Iron rule: plugins must not modify core files',
  body:
    'Plugins may not touch a single line of core files like run_agent.py, cli.py, gateway/run.py, or hermes_cli/main.py. ' +
    'If a capability is missing, extend the generic plugin surface — new hooks, new ctx methods — and never hardcode plugin-specific logic into the core. ' +
    'PR #5295 removed 95 lines of hardcoded honcho argparse from main.py for exactly this reason.',
};

export const PLUGIN_DISCOVERY_PITFALL_EN: typeof PLUGIN_DISCOVERY_PITFALL = {
  title: 'Timing pitfall: discover_plugins() is an import side effect',
  body:
    'discover_plugins() runs only as a side effect of importing model_tools.py. ' +
    'Any code path that reads plugin state without importing model_tools.py first must call discover_plugins() explicitly — ' +
    'it is idempotent, so an explicit call costs nothing.',
};

// 本章专属 UI 文案（表单标签、错误提示、说明 note 等）
export const PLUGIN_UI = {
  nameLabel: { zh: '插件名', en: 'Plugin name' },
  nameError: {
    zh: '✗ 需为 kebab-case：小写字母/数字/中划线（如 disk-cleanup）',
    en: '✗ Must be kebab-case: lowercase letters/digits/hyphens (e.g. disk-cleanup)',
  },
  hooksLabel: { zh: '生命周期钩子（Python 回调）', en: 'Lifecycle hooks (Python callbacks)' },
  capsLabel: { zh: 'ctx 扩展能力', en: 'ctx extension capabilities' },
  initNote: {
    zh: 'PluginManager 从 ~/.hermes/plugins/、./.hermes/plugins/ 与 pip entry points 发现插件',
    en: 'PluginManager discovers plugins from ~/.hermes/plugins/, ./.hermes/plugins/, and pip entry points',
  },
  rulesKicker: { zh: '两条红线', en: 'Two red lines' },
  rulesTitle: { zh: '写插件前必须知道的事', en: 'What you must know before writing a plugin' },
};
