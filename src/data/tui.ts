// Chapter 14「TUI 架构」数据源：进程模型 / Key Surfaces / 斜杠命令流 / render(width) 演示。
// 内容对齐 hermes-agent/AGENTS.md 的「TUI Architecture (ui-tui + tui_gateway)」一节，
// 组件名与 RPC 方法均可在 ui-tui/src/ 与 tui_gateway/ 真实源码中找到。

export interface TuiProcessNode {
  id: string;
  name: string;
  role: string;
  owns: string[];
  files: { path: string; note: string }[];
}

export interface KeySurface {
  id: string;
  surface: string;
  ink: string;
  gateway: string;
  note: string;
}

export interface SlashFlowStep {
  id: string;
  label: string;
  title: string;
  body: string;
  code: { file: string; snippet: string; note?: string };
  points: string[];
}

export const TUI_INTRO =
  'hermes --tui（或 HERMES_TUI=1）会启动一个完整替代经典 prompt_toolkit CLI 的终端界面。' +
  '它不是一个进程，而是两个：Node 跑的 Ink 前端负责「屏幕」，Python 跑的 tui_gateway 后端负责「会话」。' +
  '两者之间用换行分隔的 JSON-RPC over stdio 通信——请求从 Ink 发出，事件从 Python 推回。' +
  '点击下面进程图中的每个节点，看看谁拥有什么。';

/* ── ① 进程模型 ─────────────────────────────────────────────────── */
export const TUI_PROCESS_NODES: TuiProcessNode[] = [
  {
    id: 'ink',
    name: 'Node (Ink) 前端',
    role: 'TypeScript 拥有屏幕',
    owns: [
      '渲染 transcript（对话记录）、composer（输入框）、prompts（审批/澄清弹层）',
      '渲染 activity（工具活动流）与主题皮肤',
      '本地处理内建斜杠命令（/help、/quit、/clear、/resume、/copy、/paste 等）',
      '斜杠命令与路径的自动补全（useCompletion hook）',
    ],
    files: [
      { path: 'ui-tui/src/app.tsx', note: '前端入口与本地斜杠命令处理' },
      { path: 'ui-tui/src/components/messageLine.tsx', note: '对话行渲染' },
      { path: 'ui-tui/src/components/prompts.tsx', note: '审批 / 澄清弹层' },
      { path: 'ui-tui/src/theme.ts', note: '主题（skin 数据落地处）' },
    ],
  },
  {
    id: 'rpc',
    name: 'stdio JSON-RPC',
    role: '换行分隔的 JSON-RPC over stdio',
    owns: [
      '请求从 Ink 发出（如 prompt.submit、approval.respond）',
      '事件从 Python 推回（如 message.delta、tool.start、approval.request）',
      '完整的方法 / 事件目录见 tui_gateway/server.py',
    ],
    files: [
      { path: 'tui_gateway/server.py', note: 'RPC 方法与事件的全量目录' },
      { path: 'tui_gateway/transport.py', note: '传输层' },
    ],
  },
  {
    id: 'gateway',
    name: 'Python (tui_gateway) 后端',
    role: 'Python 拥有会话、工具、模型调用与斜杠命令逻辑',
    owns: [
      '会话生命周期：session.list / session.resume',
      '斜杠命令执行：slash.exec 在持久 _SlashWorker 子进程中运行',
      '补全服务：complete.slash / complete.path',
      '启动时通过 gateway.ready 事件下发 skin 数据',
    ],
    files: [
      { path: 'tui_gateway/server.py', note: '_SlashWorker 等核心逻辑所在' },
      { path: 'tui_gateway/slash_worker.py', note: '斜杠命令子进程入口' },
    ],
  },
  {
    id: 'agent',
    name: 'AIAgent + tools + sessions',
    role: '与经典 CLI 完全相同的 agent 内核',
    owns: [
      '主循环：组装消息 → 调模型 → 执行工具 → 追加结果（见第 04 章）',
      '工具注册与执行、会话落盘',
      'TUI 只是换了一层「皮」，内核零改动',
    ],
    files: [
      { path: 'run_agent.py', note: 'AIAgent 主循环' },
      { path: 'tools/', note: '工具集' },
    ],
  },
];

/* ── ② Key Surfaces（照 AGENTS.md 表格） ────────────────────────── */
export const KEY_SURFACES: KeySurface[] = [
  {
    id: 'chat',
    surface: 'Chat streaming',
    ink: 'app.tsx + messageLine.tsx',
    gateway: 'prompt.submit → message.delta/complete',
    note: '前端提交 prompt.submit，Python 以 message.delta 流式回推增量文本，message.complete 收尾。',
  },
  {
    id: 'tool',
    surface: 'Tool activity',
    ink: 'thinking.tsx',
    gateway: 'tool.start/progress/complete',
    note: '工具生命周期事件驱动「正在执行」活动区：开始、进度、完成。',
  },
  {
    id: 'approval',
    surface: 'Approvals',
    ink: 'prompts.tsx',
    gateway: 'approval.respond ← approval.request',
    note: '危险命令审批：方向与聊天相反——Python 发 approval.request 事件下行，前端用 approval.respond 上行回答。',
  },
  {
    id: 'clarify',
    surface: 'Clarify/sudo/secret',
    ink: 'prompts.tsx, maskedPrompt.tsx',
    gateway: 'clarify/sudo/secret.respond',
    note: '澄清提问、sudo、密钥输入共用一个弹层族；maskedPrompt.tsx 负责密钥的掩码输入。',
  },
  {
    id: 'session',
    surface: 'Session picker',
    ink: 'sessionPicker.tsx',
    gateway: 'session.list/resume',
    note: '会话选择器：列出历史会话并恢复其中一条。',
  },
  {
    id: 'slash',
    surface: 'Slash commands',
    ink: 'Local handler + fallthrough',
    gateway: 'slash.exec → _SlashWorker, command.dispatch',
    note: '本地内建命令直接处理，其余一律发给 Python——详见下方「斜杠命令流」。',
  },
  {
    id: 'completion',
    surface: 'Completions',
    ink: 'useCompletion hook',
    gateway: 'complete.slash, complete.path',
    note: '输入时的自动补全：斜杠命令走 complete.slash，文件路径走 complete.path。',
  },
  {
    id: 'theme',
    surface: 'Theming',
    ink: 'theme.ts + branding.tsx',
    gateway: 'gateway.ready with skin data',
    note: 'skin 数据随 gateway.ready 事件在启动时下发，前端据此渲染主题与品牌元素。',
  },
];

/* ── ③ 斜杠命令流 ───────────────────────────────────────────────── */
export const SLASH_FLOW_STEPS: SlashFlowStep[] = [
  {
    id: 'local',
    label: '本地内建',
    title: '第一步：app.tsx 本地处理',
    body: '/help、/quit、/clear、/resume、/copy、/paste 等内建命令完全在 Ink 前端本地处理——不序列化、不出进程、不等 Python。这些命令操作的是「屏幕」本身（清屏、复制、退出），而屏幕归 TypeScript 所有，所以根本不需要后端参与。',
    code: {
      file: 'ui-tui/src/app.tsx',
      snippet: `// 内建命令：/help /quit /clear /resume /copy /paste ...
// 在 app.tsx 本地处理，不发 RPC`,
      note: '操作屏幕的命令留在屏幕的拥有者手里',
    },
    points: ['零 RPC 往返，即时响应', '只覆盖「纯界面」语义的命令'],
  },
  {
    id: 'worker',
    label: 'slash.exec',
    title: '第二步：_SlashWorker 子进程执行',
    body: '其余所有斜杠命令通过 slash.exec 发给 Python。tui_gateway 不在自己的主进程里跑它们，而是交给一个持久的 _SlashWorker 子进程（定义在 tui_gateway/server.py，子进程入口 tui_gateway/slash_worker.py）——命令再慢也不会阻塞网关主循环。',
    code: {
      file: 'tui_gateway/server.py',
      snippet: `# slash.exec → 持久 _SlashWorker 子进程
# （子进程入口：tui_gateway/slash_worker.py）`,
      note: 'worker 是持久的：命令之间不用反复起进程',
    },
    points: ['主网关进程不被命令执行拖住', 'worker 随会话创建、随会话回收'],
  },
  {
    id: 'dispatch',
    label: 'command.dispatch',
    title: '第三步：command.dispatch 兜底',
    body: 'slash.exec 处理不了的，回退到 command.dispatch——由网关把命令解析为 skill / alias / exec 指令。技能命令会被解析成一条普通 prompt 提交给 agent，这也是为什么技能斜杠命令在所有前端（TUI、桌面端）里行为一致。',
    code: {
      file: 'tui_gateway/server.py',
      snippet: `# slash.exec 不成 → command.dispatch 兜底
# 网关解析为 skill / alias / exec 指令`,
      note: '同一套兜底逻辑也服务桌面端（apps/desktop/）',
    },
    points: ['技能命令 = 注入为普通 user 消息', '解析规则集中在网关，前端不各写一份'],
  },
];

/* ── ④ render(width) 迷你演示 ───────────────────────────────────── */
export const WIDTH_DEMO = {
  min: 24,
  max: 72,
  step: 4,
  defaultWidth: 48,
  text:
    'TypeScript owns the screen. Python owns sessions, tools, model calls, ' +
    'and slash command logic. 屏幕归前端，会话归后端，两者之间只隔着换行分隔的 JSON-RPC。',
  explain:
    '把每个终端组件理解成一个纯函数：render(width) → 行数组。终端没有「词」的概念，' +
    '折行发生在显示单元格边界——所以上面的文本是按字符硬折行的。' +
    '当终端宽度变化（或任何状态变化），已排好版的行缓存被 invalidate（失效），' +
    '组件请求一次 requestRender，按新宽度重新执行 render(width)。' +
    'ui-tui 源码里是同一思想：useVirtualHistory.ts 用 offsetVersion 失效偏移缓存，' +
    '宽度一变，历史行的偏移全部重算。',
};

// 终端式折行：按显示宽度硬切（演示用，忽略宽字符）。
export function wrapTerminalLines(text: string, width: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += width) {
    lines.push(text.slice(i, i + width));
  }
  return lines;
}

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const TUI_INTRO_EN =
  'hermes --tui (or HERMES_TUI=1) launches a terminal UI that fully replaces the classic ' +
  'prompt_toolkit CLI. It is not one process but two: a Node Ink frontend owns the "screen", ' +
  'a Python tui_gateway backend owns the "session". They communicate over newline-delimited ' +
  'JSON-RPC on stdio — requests go out from Ink, events stream back from Python. ' +
  'Click each node in the process diagram below to see who owns what.';

/* ── ① 进程模型 ─────────────────────────────────────────────────── */
export const TUI_PROCESS_NODES_EN: TuiProcessNode[] = [
  {
    id: 'ink',
    name: 'Node (Ink) frontend',
    role: 'TypeScript owns the screen',
    owns: [
      'Renders the transcript (conversation history), composer (input box), and prompts (approval/clarification overlays)',
      'Renders the activity stream (tool activity) and theme skins',
      'Handles built-in slash commands locally (/help, /quit, /clear, /resume, /copy, /paste, etc.)',
      'Autocomplete for slash commands and paths (useCompletion hook)',
    ],
    files: [
      { path: 'ui-tui/src/app.tsx', note: 'Frontend entry and local slash-command handling' },
      { path: 'ui-tui/src/components/messageLine.tsx', note: 'Conversation line rendering' },
      { path: 'ui-tui/src/components/prompts.tsx', note: 'Approval / clarification overlays' },
      { path: 'ui-tui/src/theme.ts', note: 'Theme (where skin data lands)' },
    ],
  },
  {
    id: 'rpc',
    name: 'stdio JSON-RPC',
    role: 'Newline-delimited JSON-RPC over stdio',
    owns: [
      'Requests go out from Ink (e.g. prompt.submit, approval.respond)',
      'Events stream back from Python (e.g. message.delta, tool.start, approval.request)',
      'Full method / event catalog in tui_gateway/server.py',
    ],
    files: [
      { path: 'tui_gateway/server.py', note: 'Full catalog of RPC methods and events' },
      { path: 'tui_gateway/transport.py', note: 'Transport layer' },
    ],
  },
  {
    id: 'gateway',
    name: 'Python (tui_gateway) backend',
    role: 'Python owns sessions, tools, model calls, and slash-command logic',
    owns: [
      'Session lifecycle: session.list / session.resume',
      'Slash command execution: slash.exec runs in a persistent _SlashWorker subprocess',
      'Completion service: complete.slash / complete.path',
      'Pushes skin data via the gateway.ready event at startup',
    ],
    files: [
      { path: 'tui_gateway/server.py', note: 'Core logic including _SlashWorker' },
      { path: 'tui_gateway/slash_worker.py', note: 'Slash-command subprocess entry' },
    ],
  },
  {
    id: 'agent',
    name: 'AIAgent + tools + sessions',
    role: 'The exact same agent core as the classic CLI',
    owns: [
      'agent loop: assemble messages → call the model → execute tools → append results (see Chapter 04)',
      'Tool registration and execution, session persistence',
      'The TUI is just a different "skin" — zero changes to the core',
    ],
    files: [
      { path: 'run_agent.py', note: 'AIAgent main loop' },
      { path: 'tools/', note: 'Toolset' },
    ],
  },
];

/* ── ② Key Surfaces（照 AGENTS.md 表格） ────────────────────────── */
export const KEY_SURFACES_EN: KeySurface[] = [
  {
    id: 'chat',
    surface: 'Chat streaming',
    ink: 'app.tsx + messageLine.tsx',
    gateway: 'prompt.submit → message.delta/complete',
    note: 'The frontend submits prompt.submit; Python streams incremental text back via message.delta and closes with message.complete.',
  },
  {
    id: 'tool',
    surface: 'Tool activity',
    ink: 'thinking.tsx',
    gateway: 'tool.start/progress/complete',
    note: 'Tool lifecycle events drive the "running" activity area: start, progress, complete.',
  },
  {
    id: 'approval',
    surface: 'Approvals',
    ink: 'prompts.tsx',
    gateway: 'approval.respond ← approval.request',
    note: 'Dangerous-command approvals: the direction is reversed from chat — Python sends the approval.request event downstream, the frontend answers upstream with approval.respond.',
  },
  {
    id: 'clarify',
    surface: 'Clarify/sudo/secret',
    ink: 'prompts.tsx, maskedPrompt.tsx',
    gateway: 'clarify/sudo/secret.respond',
    note: 'Clarifications, sudo, and secret input share one overlay family; maskedPrompt.tsx handles masked secret input.',
  },
  {
    id: 'session',
    surface: 'Session picker',
    ink: 'sessionPicker.tsx',
    gateway: 'session.list/resume',
    note: 'Session picker: list past sessions and resume one.',
  },
  {
    id: 'slash',
    surface: 'Slash commands',
    ink: 'Local handler + fallthrough',
    gateway: 'slash.exec → _SlashWorker, command.dispatch',
    note: 'Built-in commands are handled locally; everything else goes to Python — see "Slash Command Flow" below.',
  },
  {
    id: 'completion',
    surface: 'Completions',
    ink: 'useCompletion hook',
    gateway: 'complete.slash, complete.path',
    note: 'Autocomplete as you type: slash commands via complete.slash, file paths via complete.path.',
  },
  {
    id: 'theme',
    surface: 'Theming',
    ink: 'theme.ts + branding.tsx',
    gateway: 'gateway.ready with skin data',
    note: 'Skin data is pushed at startup with the gateway.ready event; the frontend renders theme and branding from it.',
  },
];

/* ── ③ 斜杠命令流 ───────────────────────────────────────────────── */
export const SLASH_FLOW_STEPS_EN: SlashFlowStep[] = [
  {
    id: 'local',
    label: 'Local built-ins',
    title: 'Step 1: handled locally in app.tsx',
    body: 'Built-in commands like /help, /quit, /clear, /resume, /copy, /paste are handled entirely in the Ink frontend — no serialization, no process hop, no waiting on Python. These commands operate on the "screen" itself (clear, copy, quit), and the screen belongs to TypeScript, so the backend is simply not involved.',
    code: {
      file: 'ui-tui/src/app.tsx',
      snippet: `// 内建命令：/help /quit /clear /resume /copy /paste ...
// 在 app.tsx 本地处理，不发 RPC`,
      note: "Commands that operate on the screen stay with the screen's owner",
    },
    points: [
      'Zero RPC round-trips, instant response',
      'Covers only commands with pure-UI semantics',
    ],
  },
  {
    id: 'worker',
    label: 'slash.exec',
    title: 'Step 2: executed in the _SlashWorker subprocess',
    body: 'All other slash commands go to Python via slash.exec. tui_gateway does not run them in its own main process — it hands them to a persistent _SlashWorker subprocess (defined in tui_gateway/server.py, subprocess entry tui_gateway/slash_worker.py), so however slow a command is, it never blocks the gateway main loop.',
    code: {
      file: 'tui_gateway/server.py',
      snippet: `# slash.exec → 持久 _SlashWorker 子进程
# （子进程入口：tui_gateway/slash_worker.py）`,
      note: 'The worker is persistent: no process startup cost between commands',
    },
    points: [
      'The main gateway process is never stalled by command execution',
      'The worker is created and reclaimed with the session',
    ],
  },
  {
    id: 'dispatch',
    label: 'command.dispatch',
    title: 'Step 3: command.dispatch as fallback',
    body: 'Whatever slash.exec cannot handle falls back to command.dispatch — the gateway parses the command into a skill / alias / exec directive. Skill commands are resolved into an ordinary prompt submitted to the agent, which is why skill slash commands behave identically across all frontends (TUI, desktop).',
    code: {
      file: 'tui_gateway/server.py',
      snippet: `# slash.exec 不成 → command.dispatch 兜底
# 网关解析为 skill / alias / exec 指令`,
      note: 'The same fallback logic also serves the desktop app (apps/desktop/)',
    },
    points: [
      'Skill commands = injected as ordinary user messages',
      'Parsing rules live centrally in the gateway, not duplicated per frontend',
    ],
  },
];

/* ── ④ render(width) 迷你演示 ───────────────────────────────────── */
export const WIDTH_DEMO_EN: typeof WIDTH_DEMO = {
  min: 24,
  max: 72,
  step: 4,
  defaultWidth: 48,
  text:
    'TypeScript owns the screen. Python owns sessions, tools, model calls, ' +
    'and slash command logic. The frontend owns the screen, the backend owns ' +
    'the session — nothing between them but newline-delimited JSON-RPC.',
  explain:
    'Think of every terminal component as a pure function: render(width) → an array of lines. ' +
    'Terminals have no concept of "words" — wrapping happens at display-cell boundaries, ' +
    'which is why the text above is hard-wrapped per character. ' +
    'When the terminal width changes (or any state changes), the laid-out line cache is ' +
    'invalidated, the component requests a requestRender, and render(width) re-runs at the new width. ' +
    'The ui-tui source applies the same idea: useVirtualHistory.ts invalidates the offset cache ' +
    'with offsetVersion — change the width and every history line offset is recomputed.',
};

// TUILab 组件专属 UI 文案（通用文案见 ui-strings.ts）。
export const TUI_LAB_UI = {
  processKicker: { zh: '进程模型', en: 'Process Model' },
  processTitle: { zh: '两个进程，一份职责清单', en: 'Two processes, one responsibility sheet' },
  keyFiles: { zh: '关键源码', en: 'Key source files' },
  surfacesKicker: { zh: 'Key Surfaces', en: 'Key Surfaces' },
  surfacesTitle: { zh: '界面 ↔ RPC 对照表', en: 'UI ↔ RPC mapping table' },
  surfacesHint: {
    zh: '每一块界面能力都对应一组 Ink 组件与 gateway 方法。点击任意一行看它如何工作。',
    en: 'Every UI capability maps to a set of Ink components and gateway methods. Click any row to see how it works.',
  },
  colInk: { zh: 'Ink 组件', en: 'Ink component' },
  colGateway: { zh: 'Gateway 方法', en: 'Gateway methods' },
  slashKicker: { zh: '斜杠命令流', en: 'Slash Command Flow' },
  slashTitle: { zh: '一条 /command 的三级路由', en: 'The three-level routing of a /command' },
  widthKicker: { zh: 'render(width)', en: 'render(width)' },
  widthTitle: { zh: '宽度驱动的重渲染', en: 'Width-driven re-rendering' },
  widthHint: {
    zh: '拖动滑杆改变「终端宽度」，下方文本会像真实终端一样按新宽度重排。',
    en: 'Drag the slider to change the "terminal width"; the text below reflows like a real terminal.',
  },
  widthAria: { zh: '终端宽度', en: 'Terminal width' },
  renderLines: {
    zh: (n: number) => `→ ${n} 行`,
    en: (n: number) => `→ ${n} lines`,
  },
  footerNote: {
    zh: '一句话记住 TUI：TypeScript 拥有屏幕，Python 拥有会话——中间只隔着换行分隔的 JSON-RPC。dashboard 里的聊天也不是重写，而是通过 PTY 嵌入真实的 hermes --tui。',
    en: 'The TUI in one sentence: TypeScript owns the screen, Python owns the session — with nothing but newline-delimited JSON-RPC between them. The chat in the dashboard is not a rewrite either: it embeds the real hermes --tui via PTY.',
  },
} as const;
