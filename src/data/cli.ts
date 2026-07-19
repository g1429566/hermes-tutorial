// Chapter 15「CLI 架构」数据源：CommandDef 字段 / 命令树 / 注册表消费者 / 添加命令四步。
// 内容对齐 hermes-agent/AGENTS.md 的「CLI Architecture (cli.py)」与
// 「Slash Command Registry (hermes_cli/commands.py)」两节；代码片段逐字摘自真实源码。

export interface CommandFieldDoc {
  id: string;
  name: string;
  type: string;
  desc: string;
  example: string;
}

export interface CliCommand {
  id: string; // 规范名（不带斜杠）
  desc: string; // 中文说明
  aliases?: string;
  argsHint?: string;
  flags: string[]; // cli_only / gateway_only / gateway_config_gate=...
  snippet: string; // 逐字摘自 hermes_cli/commands.py 的 CommandDef
}

export interface RegistryConsumer {
  id: string;
  name: string;
  deriver: string;
  body: string;
}

export interface AddCommandStep {
  id: string;
  label: string;
  title: string;
  body: string;
  code: { file: string; snippet: string; note?: string };
}

export const CLI_INTRO =
  '经典 CLI（cli.py）用 Rich 画 banner 与面板、用 prompt_toolkit 做带自动补全的输入。' +
  '但真正的主角是 hermes_cli/commands.py 里的 COMMAND_REGISTRY——一份 CommandDef 列表，' +
  '它是所有斜杠命令的单一事实来源：CLI 分发、网关分发、Telegram 菜单、Slack 子命令、' +
  '自动补全、两端的 help，全部从它自动派生。process_command() 只做一件事：' +
  '用 resolve_command() 把别名解析成规范名，然后分发。';

/* ── ① CommandDef 字段（hermes_cli/commands.py 的 frozen dataclass） ── */
export const COMMAND_DEF_FIELDS: CommandFieldDoc[] = [
  {
    id: 'name',
    name: 'name',
    type: 'str',
    desc: '规范名，不带斜杠。所有分发都先 resolve_command() 到这个名字。',
    example: '"background"',
  },
  {
    id: 'description',
    name: 'description',
    type: 'str',
    desc: '人类可读描述，出现在 CLI help、网关 /help、Telegram 菜单里。',
    example: '"Run a prompt in the background"',
  },
  {
    id: 'category',
    name: 'category',
    type: 'str',
    desc: '五个分类之一，决定 help 里的分组（COMMANDS_BY_CATEGORY）。',
    example: '"Session" | "Configuration" | "Tools & Skills" | "Info" | "Exit"',
  },
  {
    id: 'aliases',
    name: 'aliases',
    type: 'tuple[str, ...]',
    desc: '别名元组。加一个别名只需改这里——分发、help、菜单、补全自动同步。',
    example: '("bg", "btw")',
  },
  {
    id: 'args_hint',
    name: 'args_hint',
    type: 'str',
    desc: 'help 中显示的参数占位符，提示用户这个命令接收什么参数。',
    example: '"<prompt>" 或 "[name]"',
  },
  {
    id: 'cli_only',
    name: 'cli_only',
    type: 'bool = False',
    desc: '只在交互式 CLI 可用（如 /clear——消息平台上没有「清屏」语义）。',
    example: '/clear、/config、/quit',
  },
  {
    id: 'gateway_only',
    name: 'gateway_only',
    type: 'bool = False',
    desc: '只在消息平台（gateway）可用，CLI 里不出现。',
    example: '/approve（审批危险命令）',
  },
  {
    id: 'gateway_config_gate',
    name: 'gateway_config_gate',
    type: 'str | None = None',
    desc: 'config dotpath。设在 cli_only 命令上时，该配置值为真，命令就在网关可用。GATEWAY_KNOWN_COMMANDS 永远包含 config-gated 命令以便分发；help 与菜单只在 gate 打开时展示。',
    example: '/verbose → "display.tool_progress_command"',
  },
];

/* ── ② 命令树（按 category 分组，snippet 逐字摘自 commands.py） ────── */
export const COMMAND_CATEGORIES = ['Session', 'Configuration', 'Tools & Skills', 'Info', 'Exit'];

export const CLI_COMMANDS: Record<string, CliCommand[]> = {
  Session: [
    {
      id: 'new',
      desc: '开始新会话（新 session ID + 新历史）',
      aliases: 'reset',
      argsHint: '[name]',
      flags: [],
      snippet: `CommandDef("new", "Start a new session (fresh session ID + history)", "Session",
           aliases=("reset",), args_hint="[name]"),`,
    },
    {
      id: 'clear',
      desc: '清屏并开始新会话',
      flags: ['cli_only'],
      snippet: `CommandDef("clear", "Clear screen and start a new session", "Session",
           cli_only=True),`,
    },
    {
      id: 'compress',
      desc: '压缩对话上下文（here [N] 保留最近 N 轮）',
      aliases: 'compact',
      argsHint: '[here [N] | focus topic | --preview|--dry-run]',
      flags: [],
      snippet: `CommandDef("compress", "Compress conversation context (...)", "Session",
           aliases=("compact",), args_hint="[here [N] | focus topic | --preview|--dry-run]"),`,
    },
    {
      id: 'background',
      desc: '后台运行一个 prompt',
      aliases: 'bg, btw',
      argsHint: '<prompt>',
      flags: [],
      snippet: `CommandDef("background", "Run a prompt in the background", "Session",
           aliases=("bg", "btw"), args_hint="<prompt>"),`,
    },
    {
      id: 'queue',
      desc: '把 prompt 排队到下一轮（不打断当前轮）',
      aliases: 'q',
      argsHint: '<prompt>',
      flags: [],
      snippet: `CommandDef("queue", "Queue a prompt for the next turn (doesn't interrupt)", "Session",
           aliases=("q",), args_hint="<prompt>"),`,
    },
    {
      id: 'status',
      desc: '显示会话、模型、token 与上下文信息',
      flags: [],
      snippet: `CommandDef("status", "Show session, model, token, and context info", "Session"),`,
    },
  ],
  Configuration: [
    {
      id: 'config',
      desc: '显示当前配置',
      flags: ['cli_only'],
      snippet: `CommandDef("config", "Show current configuration", "Configuration",
           cli_only=True),`,
    },
    {
      id: 'model',
      desc: '切换模型（默认持久化）',
      argsHint: '[model] [--provider name] [--global|--session] [--refresh]',
      flags: [],
      snippet: `CommandDef("model", "Switch model (persists by default)", "Configuration",
           args_hint="[model] [--provider name] [--global|--session] [--refresh]"),`,
    },
    {
      id: 'statusbar',
      desc: '开关上下文 / 模型状态栏',
      aliases: 'sb',
      flags: ['cli_only'],
      snippet: `CommandDef("statusbar", "Toggle the context/model status bar", "Configuration",
           cli_only=True, aliases=("sb",)),`,
    },
    {
      id: 'timestamps',
      desc: '开关消息与 /history 的 [HH:MM] 时间戳',
      aliases: 'ts',
      argsHint: '[on|off|status]',
      flags: ['cli_only'],
      snippet: `CommandDef("timestamps", "Toggle [HH:MM] timestamps on messages and /history",
           "Configuration", cli_only=True, args_hint="[on|off|status]",
           subcommands=("on", "off", "status"), aliases=("ts",)),`,
    },
    {
      id: 'verbose',
      desc: '循环工具进度显示：off → new → all → verbose → log',
      flags: ['cli_only', 'gateway_config_gate="display.tool_progress_command"'],
      snippet: `CommandDef("verbose", "Cycle tool progress display: off -> new -> all -> verbose -> log",
           "Configuration", cli_only=True,
           gateway_config_gate="display.tool_progress_command"),`,
    },
  ],
  'Tools & Skills': [
    {
      id: 'tools',
      desc: '管理工具：/tools [list|disable|enable] [name...]',
      argsHint: '[list|disable|enable] [name...]',
      flags: ['cli_only'],
      snippet: `CommandDef("tools", "Manage tools: /tools [list|disable|enable] [name...]",
           "Tools & Skills", args_hint="[list|disable|enable] [name...]", cli_only=True),`,
    },
    {
      id: 'toolsets',
      desc: '列出可用 toolsets',
      flags: ['cli_only'],
      snippet: `CommandDef("toolsets", "List available toolsets", "Tools & Skills",
           cli_only=True),`,
    },
    {
      id: 'skills',
      desc: '搜索、安装、检视与管理技能',
      flags: ['cli_only', 'gateway_config_gate="skills.write_approval"'],
      snippet: `CommandDef("skills", "Search, install, inspect, or manage skills",
           "Tools & Skills", cli_only=True,
           gateway_config_gate="skills.write_approval", ...),`,
    },
    {
      id: 'learn',
      desc: '从任何描述（目录、URL、当前对话、笔记）学一个可复用技能',
      argsHint: '<what to learn from>',
      flags: [],
      snippet: `CommandDef("learn", "Learn a reusable skill from anything you describe (...)",
           "Tools & Skills", args_hint="<what to learn from>"),`,
    },
    {
      id: 'cron',
      desc: '管理定时任务',
      argsHint: '[subcommand]',
      flags: ['cli_only'],
      snippet: `CommandDef("cron", "Manage scheduled tasks", "Tools & Skills",
           cli_only=True, args_hint="[subcommand]", ...),`,
    },
  ],
  Info: [
    {
      id: 'whoami',
      desc: '显示你的斜杠命令权限（admin / user）',
      flags: [],
      snippet: `CommandDef("whoami", "Show your slash command access (admin / user)", "Info"),`,
    },
    {
      id: 'profile',
      desc: '显示当前 profile 名与 home 目录',
      flags: [],
      snippet: `CommandDef("profile", "Show active profile name and home directory", "Info"),`,
    },
  ],
  Exit: [
    {
      id: 'quit',
      desc: '退出 CLI（--delete 可同时删除会话历史）',
      aliases: 'exit',
      argsHint: '[--delete]',
      flags: ['cli_only'],
      snippet: `CommandDef("quit", "Exit the CLI (use --delete to also remove session history)", "Exit",
           cli_only=True, aliases=("exit",), args_hint="[--delete]"),`,
    },
  ],
};

/* ── ③ 注册表驱动一切：COMMAND_REGISTRY 的 7 个消费者 ─────────────── */
export const REGISTRY_CONSUMERS: RegistryConsumer[] = [
  {
    id: 'cli',
    name: 'CLI 分发',
    deriver: 'process_command() + resolve_command()',
    body: 'cli.py 的 HermesCLI.process_command() 用 resolve_command() 把别名解析为规范名，再按规范名分发到对应处理器。',
  },
  {
    id: 'gateway',
    name: 'Gateway 分发',
    deriver: 'GATEWAY_KNOWN_COMMANDS + resolve_command()',
    body: 'GATEWAY_KNOWN_COMMANDS frozenset 决定哪些命令触发 hook 发射；分发同样走 resolve_command()。',
  },
  {
    id: 'gateway-help',
    name: 'Gateway /help',
    deriver: 'gateway_help_lines()',
    body: '消息平台里的 /help 输出由 gateway_help_lines() 从注册表生成。',
  },
  {
    id: 'telegram',
    name: 'Telegram 菜单',
    deriver: 'telegram_bot_commands()',
    body: 'telegram_bot_commands() 生成 Telegram 客户端里的 BotCommand 菜单。',
  },
  {
    id: 'slack',
    name: 'Slack 子命令',
    deriver: 'slack_subcommand_map()',
    body: 'slack_subcommand_map() 生成 Slack 里 /hermes 的子命令路由。',
  },
  {
    id: 'autocomplete',
    name: '自动补全',
    deriver: 'COMMANDS → SlashCommandCompleter',
    body: 'COMMANDS flat dict 喂给 prompt_toolkit 的 SlashCommandCompleter，输入 / 时即时提示。',
  },
  {
    id: 'cli-help',
    name: 'CLI 帮助',
    deriver: 'COMMANDS_BY_CATEGORY → show_help()',
    body: 'COMMANDS_BY_CATEGORY dict 按 category 分组，喂给 CLI 的 show_help()。',
  },
];

export const REGISTRY_NOTE =
  '加一个别名，只需把它加进现有 CommandDef 的 aliases 元组——分发、help、' +
  'Telegram 菜单、Slack 映射、自动补全自动更新，不需要动任何其他文件。';

/* ── ④ 添加斜杠命令的四步（AGENTS.md「Adding a Slash Command」） ────── */
export const ADD_COMMAND_STEPS: AddCommandStep[] = [
  {
    id: 'def',
    label: '① 注册 CommandDef',
    title: '在 COMMAND_REGISTRY 里加一条 CommandDef',
    body: '一切从 hermes_cli/commands.py 开始。声明规范名、描述、分类，可选别名与参数提示。这一步完成后，help、补全、菜单里已经能看到它——但还没有行为。',
    code: {
      file: 'hermes_cli/commands.py',
      snippet: `CommandDef("mycommand", "Description of what it does", "Session",
           aliases=("mc",), args_hint="[arg]"),`,
    },
  },
  {
    id: 'handler',
    label: '② CLI handler',
    title: '在 HermesCLI.process_command() 里加处理器',
    body: 'cli.py 的 process_command() 按 resolve_command() 解析出的规范名分发。在这里接上你的处理逻辑。',
    code: {
      file: 'cli.py',
      snippet: `elif canonical == "mycommand":
    self._handle_mycommand(cmd_original)`,
    },
  },
  {
    id: 'gateway',
    label: '③ Gateway handler',
    title: '若命令在网关可用，再加网关处理器',
    body: '如果这条命令也要在 Telegram / Slack 等平台可用，在 gateway/run.py 里加对应的异步处理器。',
    code: {
      file: 'gateway/run.py',
      snippet: `if canonical == "mycommand":
    return await self._handle_mycommand(event)`,
    },
  },
  {
    id: 'persist',
    label: '④ 持久化设置',
    title: '需要记住的设置用 save_config_value()',
    body: '如果命令改的是持久设置（如默认模型），用 cli.py 的 save_config_value() 写入用户 config.yaml，而不是只在内存里生效。',
    code: {
      file: 'cli.py',
      snippet: `save_config_value(key_path, value)  # 写入 config.yaml`,
      note: '临时状态不需要这一步',
    },
  },
];
