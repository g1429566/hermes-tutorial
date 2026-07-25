// Chapter 00「先建立直觉」数据源：Hero 文案 + 终端动画脚本。

export type TerminalLineKind = 'cmd' | 'agent' | 'tool' | 'ok' | 'out';

export interface TerminalLine {
  kind: TerminalLineKind;
  text: string;
}

export const HERO = {
  kicker: 'M0 · 认识 HERMES',
  title: '先建立直觉',
  subtitle:
    'Hermes 是一个会积累的自进化 AI agent：从经验中创建技能、跨会话记住你、' +
    '在你自己的机器或云端干活，手机上也能遥控。这一章不写代码——先看它跑起来是什么样子。',
  points: [
    '自进化技能：复杂任务后自动沉淀可复用技能',
    '跨会话记忆：FTS5 搜索 + LLM 摘要 + 用户建模',
    '20+ 平台网关：Telegram 一句话，云端 VM 上干活',
  ],
  cta: '开始第 01 章 · 读懂仓库地图 →',
};

export const TERMINAL_LINES: TerminalLine[] = [
  { kind: 'cmd', text: 'hermes' },
  { kind: 'out', text: '✻ Hermes Agent — 输入消息开始对话，/help 查看命令' },
  { kind: 'cmd', text: '帮我看看 gateway 怎么接入一个新平台' },
  { kind: 'agent', text: '我先读一下网关的平台适配层结构……' },
  { kind: 'tool', text: '✓ Read gateway/ADDING_A_PLATFORM.md' },
  { kind: 'tool', text: '✓ Grep "register_platform" gateway/platforms/' },
  {
    kind: 'agent',
    text: '接入新平台只需三步：① 在 platforms/ 加 adapter ② 注册到 run.py ③ 配置凭据……',
  },
  { kind: 'ok', text: '⚡ 已把「平台接入流程」保存为技能，下次直接复用' },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const HERO_EN: typeof HERO = {
  kicker: 'M0 · MEET HERMES',
  title: 'Build Intuition First',
  subtitle:
    'Hermes is a self-evolving AI agent that accumulates: it distills skills from experience, ' +
    'remembers you across sessions, and works on your own machine or in the cloud — remote-controllable ' +
    'from your phone. No code in this chapter — just watch it run.',
  points: [
    'Self-evolving skills: reusable skills distilled automatically after complex tasks',
    'Cross-session memory: FTS5 search + LLM summaries + user modeling',
    '20+ platform gateways: one Telegram message, work done on a cloud VM',
  ],
  cta: 'Start Chapter 01 · Read the Repo Map →',
};

export const TERMINAL_LINES_EN: TerminalLine[] = [
  { kind: 'cmd', text: 'hermes' },
  { kind: 'out', text: '✻ Hermes Agent — type a message to start, /help for commands' },
  { kind: 'cmd', text: 'show me how to onboard a new platform to the gateway' },
  { kind: 'agent', text: "Let me read the gateway's platform adapter layer first……" },
  { kind: 'tool', text: '✓ Read gateway/ADDING_A_PLATFORM.md' },
  { kind: 'tool', text: '✓ Grep "register_platform" gateway/platforms/' },
  {
    kind: 'agent',
    text: 'Three steps to onboard a platform: ① add an adapter in platforms/ ② register it in run.py ③ configure credentials……',
  },
  { kind: 'ok', text: '⚡ Saved "platform onboarding flow" as a skill — reusable next time' },
];
