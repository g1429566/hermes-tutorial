// Chapter 01「读懂仓库地图」数据源：hermes-agent 仓库的六大组成部分。
// 内容对齐 hermes-agent/AGENTS.md 的 Project Structure 与 File Dependency Chain。

export interface ArchComponent {
  id: string;
  name: string;
  tagline: string;
  role: string;
  responsibilities: string[];
  keyFiles: { path: string; note: string }[];
  dependsOn: string[]; // 其他组件 id
}

export const ARCH_COMPONENTS: ArchComponent[] = [
  {
    id: 'core',
    name: 'Agent 核心',
    tagline: '对话主循环与工具编排',
    role: '整个系统的心脏：接收输入、组装上下文、调用模型、执行工具、循环直到任务完成。所有前端（CLI / TUI / 网关）最终都驱动同一个 agent 核心。',
    responsibilities: [
      '维护对话状态与主循环（AIAgent）',
      '发现、校验、执行工具调用',
      '管理 toolsets：哪些工具进入系统提示',
      '记忆、缓存、上下文压缩等内部机制',
    ],
    keyFiles: [
      { path: 'run_agent.py', note: 'AIAgent 类 —— 核心对话循环（~12k LOC）' },
      {
        path: 'model_tools.py',
        note: '工具编排：discover_builtin_tools() / handle_function_call()',
      },
      { path: 'toolsets.py', note: 'toolset 定义与 _HERMES_CORE_TOOLS 列表' },
      { path: 'agent/', note: 'provider 适配、记忆、缓存、压缩等内部实现' },
    ],
    dependsOn: ['tools'],
  },
  {
    id: 'frontends',
    name: 'CLI / TUI 前端',
    tagline: '人与 agent 的直接交互层',
    role: 'CLI 是单进程交互式命令行；TUI 是基于 Ink（React）的终端界面，通过 JSON-RPC 与 Python 后端通信。两者都不含业务逻辑，只是 agent 核心的「遥控器」。',
    responsibilities: [
      '交互式对话、斜杠命令、流式输出渲染',
      'CLI 子命令：model / tools / config / gateway / setup / doctor',
      'TUI 多行编辑、历史、中断重定向',
      '配置向导与诊断（hermes setup / hermes doctor）',
    ],
    keyFiles: [
      { path: 'cli.py', note: 'HermesCLI 类 —— 交互式 CLI 编排器（~11k LOC）' },
      { path: 'hermes_cli/', note: 'CLI 子命令、setup 向导、插件加载器' },
      { path: 'ui-tui/src/', note: 'Ink 终端 UI：entry.tsx / app.tsx / gatewayClient.ts' },
      { path: 'tui_gateway/', note: 'TUI 的 Python JSON-RPC 后端' },
    ],
    dependsOn: ['core'],
  },
  {
    id: 'gateway',
    name: '消息网关',
    tagline: '20+ 平台统一接入',
    role: '单一 gateway 进程把 Telegram、Discord、Slack、WhatsApp、Signal 等平台的消息适配成统一会话，转发给 agent 核心，再把回复路由回原平台。',
    responsibilities: [
      '每个平台一个 adapter（gateway/platforms/）',
      '会话管理：跨平台连续性、消息路由',
      '语音消息转录',
      '平台扩展规范（ADDING_A_PLATFORM.md）',
    ],
    keyFiles: [
      { path: 'gateway/run.py', note: '网关入口与主循环' },
      { path: 'gateway/session.py', note: '会话状态与消息流转' },
      {
        path: 'gateway/platforms/',
        note: 'telegram / discord / slack / whatsapp / signal / feishu / …',
      },
      { path: 'gateway/ADDING_A_PLATFORM.md', note: '新增平台 adapter 的官方指南' },
    ],
    dependsOn: ['core'],
  },
  {
    id: 'tools',
    name: '工具与执行环境',
    tagline: 'agent 的「手」',
    role: 'tools/ 下的工具实现通过 registry.py 自动发现；tools/environments/ 提供 6 种终端后端，让同一份工具代码跑在本地、Docker、SSH 或 serverless 环境里。',
    responsibilities: [
      '文件读写、搜索、bash 等工具实现',
      '工具自动发现与注册（tools/registry.py，零依赖）',
      '终端后端：local / Docker / SSH / Singularity / Modal / Daytona',
      'serverless 后端的休眠 / 唤醒',
    ],
    keyFiles: [
      { path: 'tools/registry.py', note: '工具注册表 —— 被所有工具文件导入，本身无依赖' },
      { path: 'tools/', note: '工具实现：自动发现' },
      { path: 'tools/environments/', note: '6 种终端后端' },
    ],
    dependsOn: [],
  },
  {
    id: 'plugins',
    name: '插件与技能',
    tagline: '能力长在边缘，核心保持窄腰',
    role: '新能力主要以插件和技能的形式加入，而不是膨胀核心。插件覆盖记忆 provider、模型 provider、kanban、可观测性等；技能是 agent 可学习、可复用的任务知识。',
    responsibilities: [
      'memory 插件：honcho / mem0 / supermemory',
      'model-providers 插件：openrouter / anthropic / gmi',
      'kanban：多 agent 看板调度',
      '内置技能与可选技能（agentskills.io 开放标准）',
    ],
    keyFiles: [
      {
        path: 'plugins/',
        note: '插件系统：memory / context_engine / model-providers / kanban / …',
      },
      { path: 'skills/', note: '仓库内置技能' },
      { path: 'optional-skills/', note: '更重 / 小众的技能，默认不启用' },
    ],
    dependsOn: ['core'],
  },
  {
    id: 'infra',
    name: '调度与状态',
    tagline: '定时任务、会话存储与路径约定',
    role: 'cron/ 提供无人值守的定时调度；hermes_state.py 用 SQLite（FTS5）持久化会话，支撑跨会话搜索；hermes_constants.py 统一定位 ~/.hermes 下的配置与日志。',
    responsibilities: [
      'cron 调度器：自然语言描述的定时任务',
      'SessionDB：SQLite 会话存储 + FTS5 全文搜索',
      'profile 感知的路径（多实例隔离）',
      'agent.log / errors.log / gateway.log 日志约定',
    ],
    keyFiles: [
      { path: 'cron/jobs.py', note: '定时任务定义' },
      { path: 'cron/scheduler.py', note: '调度器主循环' },
      { path: 'hermes_state.py', note: 'SessionDB —— SQLite + FTS5' },
      { path: 'hermes_constants.py', note: 'get_hermes_home() —— profile 感知路径' },
    ],
    dependsOn: ['core'],
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const ARCH_COMPONENTS_EN: ArchComponent[] = [
  {
    id: 'core',
    name: 'Agent Core',
    tagline: 'The agent loop and tool orchestration',
    role: 'The heart of the system: receives input, assembles context, calls the model, executes tools, and loops until the task is done. Every frontend (CLI / TUI / gateway) ultimately drives the same agent core.',
    responsibilities: [
      'Maintains conversation state and the agent loop (AIAgent)',
      'Discovers, validates, and executes tool calls',
      'Manages toolsets: which tools enter the system prompt',
      'Internal machinery: memory, caching, context compression',
    ],
    keyFiles: [
      { path: 'run_agent.py', note: 'AIAgent class — the core conversation loop (~12k LOC)' },
      {
        path: 'model_tools.py',
        note: 'Tool orchestration: discover_builtin_tools() / handle_function_call()',
      },
      { path: 'toolsets.py', note: 'Toolset definitions and the _HERMES_CORE_TOOLS list' },
      {
        path: 'agent/',
        note: 'Internal implementations: provider adapters, memory, caching, compression',
      },
    ],
    dependsOn: ['tools'],
  },
  {
    id: 'frontends',
    name: 'CLI / TUI Frontends',
    tagline: 'The direct interaction layer between humans and the agent',
    role: 'The CLI is a single-process interactive command line; the TUI is an Ink (React)-based terminal UI that talks to the Python backend over JSON-RPC. Neither contains business logic — they are just "remote controls" for the agent core.',
    responsibilities: [
      'Interactive chat, slash commands, streaming output rendering',
      'CLI subcommands: model / tools / config / gateway / setup / doctor',
      'TUI multi-line editing, history, interrupt-and-redirect',
      'Setup wizard and diagnostics (hermes setup / hermes doctor)',
    ],
    keyFiles: [
      { path: 'cli.py', note: 'HermesCLI class — interactive CLI orchestrator (~11k LOC)' },
      { path: 'hermes_cli/', note: 'CLI subcommands, setup wizard, plugin loader' },
      { path: 'ui-tui/src/', note: 'Ink terminal UI: entry.tsx / app.tsx / gatewayClient.ts' },
      { path: 'tui_gateway/', note: "The TUI's Python JSON-RPC backend" },
    ],
    dependsOn: ['core'],
  },
  {
    id: 'gateway',
    name: 'Messaging Gateway',
    tagline: 'Unified onboarding for 20+ platforms',
    role: 'A single gateway process adapts messages from Telegram, Discord, Slack, WhatsApp, Signal, and other platforms into unified sessions, forwards them to the agent core, and routes replies back to the originating platform.',
    responsibilities: [
      'One adapter per platform (gateway/platforms/)',
      'Session management: cross-platform continuity, message routing',
      'Voice message transcription',
      'Platform extension spec (ADDING_A_PLATFORM.md)',
    ],
    keyFiles: [
      { path: 'gateway/run.py', note: 'Gateway entry point and main loop' },
      { path: 'gateway/session.py', note: 'Session state and message flow' },
      {
        path: 'gateway/platforms/',
        note: 'telegram / discord / slack / whatsapp / signal / feishu / …',
      },
      { path: 'gateway/ADDING_A_PLATFORM.md', note: 'Official guide to adding a platform adapter' },
    ],
    dependsOn: ['core'],
  },
  {
    id: 'tools',
    name: 'Tools & Execution Environments',
    tagline: 'The agent\'s "hands"',
    role: 'Tool implementations under tools/ are auto-discovered via registry.py; tools/environments/ provides 6 terminal backends, letting the same tool code run locally, in Docker, over SSH, or in serverless environments.',
    responsibilities: [
      'Tool implementations: file read/write, search, bash, etc.',
      'Tool auto-discovery and registration (tools/registry.py, zero dependencies)',
      'Terminal backends: local / Docker / SSH / Singularity / Modal / Daytona',
      'Hibernation / wake-up for serverless backends',
    ],
    keyFiles: [
      {
        path: 'tools/registry.py',
        note: 'Tool registry — imported by every tool file, itself dependency-free',
      },
      { path: 'tools/', note: 'Tool implementations: auto-discovered' },
      { path: 'tools/environments/', note: '6 terminal backends' },
    ],
    dependsOn: [],
  },
  {
    id: 'plugins',
    name: 'Plugins & Skills',
    tagline: 'Capabilities grow at the edges; the core stays a narrow waist',
    role: 'New capabilities arrive mainly as plugins and skills rather than bloating the core. Plugins cover memory providers, model providers, kanban, observability, and more; skills are learnable, reusable task knowledge for the agent.',
    responsibilities: [
      'memory plugins: honcho / mem0 / supermemory',
      'model-providers plugins: openrouter / anthropic / gmi',
      'kanban: multi-agent board scheduling',
      'Built-in and optional skills (agentskills.io open standard)',
    ],
    keyFiles: [
      {
        path: 'plugins/',
        note: 'Plugin system: memory / context_engine / model-providers / kanban / …',
      },
      { path: 'skills/', note: 'Skills bundled with the repo' },
      { path: 'optional-skills/', note: 'Heavier / niche skills, disabled by default' },
    ],
    dependsOn: ['core'],
  },
  {
    id: 'infra',
    name: 'Scheduling & State',
    tagline: 'Cron jobs, session storage, and path conventions',
    role: 'cron/ provides unattended scheduled execution; hermes_state.py persists sessions in SQLite (FTS5), powering cross-session search; hermes_constants.py unifies the location of configs and logs under ~/.hermes.',
    responsibilities: [
      'cron scheduler: scheduled jobs described in natural language',
      'SessionDB: SQLite session storage + FTS5 full-text search',
      'Profile-aware paths (multi-instance isolation)',
      'Logging conventions: agent.log / errors.log / gateway.log',
    ],
    keyFiles: [
      { path: 'cron/jobs.py', note: 'Scheduled job definitions' },
      { path: 'cron/scheduler.py', note: 'Scheduler main loop' },
      { path: 'hermes_state.py', note: 'SessionDB — SQLite + FTS5' },
      { path: 'hermes_constants.py', note: 'get_hermes_home() — profile-aware paths' },
    ],
    dependsOn: ['core'],
  },
];

// 本章实验室专属 UI 文案（组件里用 pick(lang, ARCH_UI.xxx) 取值）。
export const ARCH_UI = {
  intro: {
    zh: 'hermes-agent 是一个单仓库 Python 项目，文件极多，但承重墙只有六块。点击左侧任一组成部分，右侧会展开它的角色、职责、关键源文件，以及它依赖谁。',
    en: 'hermes-agent is a single-repo Python project with a huge number of files, but only six load-bearing walls. Click any component on the left to expand its role, responsibilities, key source files, and what it depends on.',
  },
  responsibilities: { zh: '职责', en: 'Responsibilities' },
  keyFiles: { zh: '关键源文件', en: 'Key source files' },
  dependencies: { zh: '依赖', en: 'Depends on' },
  noDeps: {
    zh: '无依赖 —— 它是地基（被所有人导入）。',
    en: "No dependencies — it's the foundation (imported by everyone).",
  },
};
