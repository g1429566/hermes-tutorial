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
