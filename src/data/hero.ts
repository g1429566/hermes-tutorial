// Chapter 00「先建立直觉」数据源：Hero 文案 + 终端动画脚本。

export type TerminalLineKind = 'cmd' | 'agent' | 'tool' | 'ok' | 'out';

export interface TerminalLine {
  kind: TerminalLineKind;
  text: string;
}

export const HERO = {
  kicker: 'M0 · 认识 HERMES',
  title: '从一次任务开始',
  subtitle:
    'Hermes 把模型的判断与工具执行连接起来。先看一次读取账单、计算与核对的示意过程，再理解技能、记忆怎样帮助下一次任务。',
  points: [
    '执行闭环：提出工具调用，观察结果，再决定下一步',
    '跨会话积累：少量稳定事实与可复用流程分别保存',
    '多种入口：终端、桌面与聊天平台驱动同一核心',
  ],
  cta: '从安装与第一次对话开始 →',
};

export const TERMINAL_LINES: TerminalLine[] = [
  {
    kind: 'out',
    text: '教学演示 · 以下数字是给定的样例，不是实时运行记录',
  },
  {
    kind: 'cmd',
    text: 'hermes',
  },
  {
    kind: 'cmd',
    text: '读取账单并求和，说明计算依据',
  },
  {
    kind: 'agent',
    text: '先读取实际文件，再核对其中的金额。',
  },
  {
    kind: 'tool',
    text: 'read_file → 早餐 12、午餐 28、晚餐 25',
  },
  {
    kind: 'tool',
    text: '计算工具 → 12 + 28 + 25 = 65',
  },
  {
    kind: 'ok',
    text: '总额 65 元；三笔记录与计算结果一致。',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const HERO_EN: typeof HERO = {
  kicker: 'M0 · MEET HERMES',
  title: 'Start with one task',
  subtitle:
    'Hermes connects model decisions to tool execution. Follow a bill-reading and calculation example, then learn how skills and memory support later work.',
  points: [
    'Execution loop: propose an action, inspect its result, then continue',
    'Reuse: store durable facts and repeatable procedures in appropriate places',
    'Interfaces: terminal, desktop, and messaging entry points share a core',
  ],
  cta: 'Begin with installation and a first conversation →',
};

export const TERMINAL_LINES_EN: TerminalLine[] = [
  {
    kind: 'out',
    text: 'Teaching example · stated inputs, not a live execution trace',
  },
  {
    kind: 'cmd',
    text: 'hermes',
  },
  {
    kind: 'cmd',
    text: 'Read the bill, total it, and explain the basis',
  },
  {
    kind: 'agent',
    text: 'Read the actual file before checking the amounts.',
  },
  {
    kind: 'tool',
    text: 'read_file → breakfast 12, lunch 28, dinner 25',
  },
  {
    kind: 'tool',
    text: 'calculation → 12 + 28 + 25 = 65',
  },
  {
    kind: 'ok',
    text: 'Total 65; the records and calculation agree.',
  },
];
