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
