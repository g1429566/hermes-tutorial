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
