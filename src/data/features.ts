// Chapter 02「功能全景」数据源：七大能力矩阵 + 场景选择器。

import type { QuizItem } from '../lib/judge';

export interface Feature {
  id: string;
  name: string;
  desc: string;
  sourceRef: string; // 对应 hermes-agent 源码位置
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  featureIds: string[]; // 该场景主要调动的能力
  explanation: string;
}

export const FEATURES: Feature[] = [
  {
    id: 'tui',
    name: '完整 TUI',
    desc: '多行编辑、斜杠命令自动补全、历史、中断重定向、流式工具输出。',
    sourceRef: 'ui-tui/src/',
  },
  {
    id: 'gateway',
    name: '多平台网关',
    desc: 'Telegram / Discord / Slack / WhatsApp / Signal 等 20+ 平台，单一 gateway 进程。',
    sourceRef: 'gateway/platforms/',
  },
  {
    id: 'skills',
    name: '技能系统',
    desc: '自进化：从经验创建技能、在使用中改进；兼容 agentskills.io 开放标准。',
    sourceRef: 'skills/',
  },
  {
    id: 'cron',
    name: '定时自动化',
    desc: '内建 cron：自然语言描述定时任务，无人值守运行。',
    sourceRef: 'cron/',
  },
  {
    id: 'delegation',
    name: '委派与并行',
    desc: '派生隔离的子 agent；用 RPC 脚本压缩多步流水线。',
    sourceRef: 'run_agent.py',
  },
  {
    id: 'backends',
    name: '多终端后端',
    desc: 'local / Docker / SSH / Singularity / Modal / Daytona，后两者支持 serverless 休眠。',
    sourceRef: 'tools/environments/',
  },
  {
    id: 'models',
    name: '模型可切换',
    desc: 'Nous Portal、OpenRouter、OpenAI、自有 endpoint；`hermes model` 一键切换。',
    sourceRef: 'providers/',
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'understand-repo',
    title: '理解陌生仓库',
    description: '丢给 Hermes 一个没见过的代码库，让它讲清架构和关键路径。',
    featureIds: ['skills', 'delegation', 'models'],
    explanation:
      '读仓库主要靠文件工具与搜索（M1 第 07 章）；读到的架构结论会沉淀为技能（第 05/06 章），大型仓库可以委派子 agent 分头探索（第 09 章）。',
  },
  {
    id: 'modify-code',
    title: '直接修改代码',
    description: '让 Hermes 改 bug、写测试、跑构建，而不是只给建议。',
    featureIds: ['backends', 'tui', 'delegation'],
    explanation:
      '改代码在终端后端里执行（第 16 章）：本地、Docker 或 serverless；TUI 里可以实时看到工具输出并随时中断重定向（第 14 章）。',
  },
  {
    id: 'remote-control',
    title: '手机上遥控',
    description: '出门在外，通过 Telegram 让跑在云 VM 上的 Hermes 继续干活。',
    featureIds: ['gateway', 'backends', 'cron'],
    explanation:
      '网关把手机消息适配成统一会话（第 10/11 章），agent 实际在云端的 Docker / Modal 后端里执行（第 16 章）——设备不绑定你的笔记本。',
  },
  {
    id: 'scheduled',
    title: '定时自动巡检',
    description: '每天早上自动检查服务状态、汇总日志，异常时推送消息。',
    featureIds: ['cron', 'gateway', 'skills'],
    explanation:
      'cron 调度器按自然语言描述触发任务（第 12 章），结果经网关推送到你的聊天平台（第 10 章）；巡检流程可以固化为技能反复复用（第 05 章）。',
  },
];

export const FEATURES_QUIZ: QuizItem = {
  id: 'what-is-hermes-1',
  question: 'Hermes Agent 最核心的差异化能力是什么？',
  options: [
    { key: 'a', text: '它支持很多 LLM provider' },
    { key: 'b', text: '内置自进化学习循环：从经验创建并改进技能、跨会话记忆' },
    { key: 'c', text: '它有一个 TUI 界面' },
    { key: 'd', text: '它可以跑在 Docker 里' },
  ],
  correct: ['b'],
  explanation:
    'provider 多样、TUI、Docker 都是不错的特性，但核心差异化是「自进化学习循环」——技能自创建/自改进 + 跨会话记忆 + 用户建模。',
};

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const FEATURES_EN: Feature[] = [
  {
    id: 'tui',
    name: 'Full-featured TUI',
    desc: 'Multi-line editing, slash-command autocomplete, history, interrupt-and-redirect, streaming tool output.',
    sourceRef: 'ui-tui/src/',
  },
  {
    id: 'gateway',
    name: 'Multi-platform gateway',
    desc: 'Telegram / Discord / Slack / WhatsApp / Signal and 20+ platforms, a single gateway process.',
    sourceRef: 'gateway/platforms/',
  },
  {
    id: 'skills',
    name: 'Skill system',
    desc: 'Self-evolving: creates skills from experience and improves them in use; compatible with the agentskills.io open standard.',
    sourceRef: 'skills/',
  },
  {
    id: 'cron',
    name: 'Scheduled automation',
    desc: 'Built-in cron: describe scheduled jobs in natural language, run them unattended.',
    sourceRef: 'cron/',
  },
  {
    id: 'delegation',
    name: 'Delegation & parallelism',
    desc: 'Spawn isolated sub-agents; compress multi-step pipelines with RPC scripts.',
    sourceRef: 'run_agent.py',
  },
  {
    id: 'backends',
    name: 'Multiple terminal backends',
    desc: 'local / Docker / SSH / Singularity / Modal / Daytona — the last two support serverless hibernation.',
    sourceRef: 'tools/environments/',
  },
  {
    id: 'models',
    name: 'Switchable models',
    desc: 'Nous Portal, OpenRouter, OpenAI, your own endpoint; switch with one `hermes model` command.',
    sourceRef: 'providers/',
  },
];

export const SCENARIOS_EN: Scenario[] = [
  {
    id: 'understand-repo',
    title: 'Understand an unfamiliar repo',
    description:
      'Hand Hermes a codebase it has never seen and have it explain the architecture and key paths.',
    featureIds: ['skills', 'delegation', 'models'],
    explanation:
      'Reading a repo relies mainly on file tools and search (M1 Chapter 07); the architectural conclusions it reaches get distilled into skills (Chapters 05/06), and large repos can be explored by delegated sub-agents in parallel (Chapter 09).',
  },
  {
    id: 'modify-code',
    title: 'Modify code directly',
    description: 'Have Hermes fix bugs, write tests, and run builds — not just give advice.',
    featureIds: ['backends', 'tui', 'delegation'],
    explanation:
      'Code changes run inside a terminal backend (Chapter 16): local, Docker, or serverless; in the TUI you can watch tool output live and interrupt-and-redirect at any time (Chapter 14).',
  },
  {
    id: 'remote-control',
    title: 'Remote control from your phone',
    description: 'While away from your desk, use Telegram to keep Hermes working on a cloud VM.',
    featureIds: ['gateway', 'backends', 'cron'],
    explanation:
      'The gateway adapts phone messages into unified sessions (Chapters 10/11), while the agent actually executes in a Docker / Modal backend in the cloud (Chapter 16) — the work is not tied to your laptop.',
  },
  {
    id: 'scheduled',
    title: 'Scheduled auto-inspection',
    description:
      'Every morning, automatically check service status and summarize logs; push a message when something is wrong.',
    featureIds: ['cron', 'gateway', 'skills'],
    explanation:
      'The cron scheduler triggers jobs from natural-language descriptions (Chapter 12) and pushes results to your chat platform via the gateway (Chapter 10); the inspection routine can be codified as a skill and reused (Chapter 05).',
  },
];

export const FEATURES_QUIZ_EN: QuizItem = {
  id: 'what-is-hermes-1',
  question: "What is Hermes Agent's most core differentiating capability?",
  options: [
    { key: 'a', text: 'It supports many LLM providers' },
    {
      key: 'b',
      text: 'A built-in self-evolving learning loop: creates and improves skills from experience, remembers across sessions',
    },
    { key: 'c', text: 'It has a TUI' },
    { key: 'd', text: 'It can run in Docker' },
  ],
  correct: ['b'],
  explanation:
    'Provider variety, the TUI, and Docker are all nice features, but the core differentiator is the "self-evolving learning loop" — self-created/self-improved skills + cross-session memory + user modeling.',
};

// 本章实验室专属 UI 文案（组件里用 pick(lang, FEATURES_UI.xxx) 取值）。
// 两段引言里带 <strong> 强调，用片段数组表示，组件按 strong 渲染。
export interface IntroSegment {
  text: string;
  strong?: boolean;
}

export const FEATURES_UI = {
  introP1: {
    zh: [
      { text: 'Hermes Agent', strong: true },
      {
        text: ' 是 Nous Research 开发的自进化 AI agent，用 Python 实现、开源（MIT）。它是目前唯一内置',
      },
      { text: '学习循环', strong: true },
      {
        text: '的 agent：从经验中创建技能、在使用中改进技能、主动持久化知识、搜索自己的历史会话，并跨会话逐步建立对你的深度理解。',
      },
    ] as IntroSegment[],
    en: [
      { text: 'Hermes Agent', strong: true },
      {
        text: ' is a self-evolving AI agent developed by Nous Research, written in Python and open source (MIT). It is currently the only agent with a built-in ',
      },
      { text: 'learning loop', strong: true },
      {
        text: ': it creates skills from experience, improves them through use, proactively persists knowledge, searches its own session history, and builds a deep understanding of you across sessions.',
      },
    ] as IntroSegment[],
  },
  introP2: {
    zh: [
      { text: '大多数 AI agent 用完即弃、每次从零开始；Hermes 的核心差异在于它会' },
      { text: '积累', strong: true },
      { text: '。下面这张矩阵是它全部能力的地图——每一行都对应 M1 的一章。' },
    ] as IntroSegment[],
    en: [
      {
        text: 'Most AI agents are disposable, starting from scratch every time; the core difference of Hermes is that it ',
      },
      { text: 'accumulates', strong: true },
      {
        text: '. The matrix below is a map of all its capabilities — each row corresponds to a chapter in M1.',
      },
    ] as IntroSegment[],
  },
  thCapability: { zh: '能力', en: 'Capability' },
  thDesc: { zh: '说明', en: 'Description' },
  thSource: { zh: '源码位置', en: 'Source' },
  scenarioKicker: { zh: '场景选择器', en: 'SCENARIO PICKER' },
  scenarioTitle: {
    zh: '你的用法会调动哪些能力？',
    en: 'Which capabilities does your use case exercise?',
  },
  scenarioBreakdown: { zh: '场景拆解', en: 'Scenario breakdown' },
  mainlyUses: { zh: '主要调动：', en: 'Mainly exercises: ' },
};
