// Chapter 22「从零设计一个新 Agent」数据源：五个设计维度，每个选项附 Hermes 真实取舍对照。

export const AGENT_DESIGN_INTRO =
  '学完 M1 你已经有了一张完整的零件图。这一章反过来用：在五个设计维度上做选择，' +
  '右侧的设计卡会实时累成一份 agent 设计文档——每个选择都对照 Hermes 的真实取舍给出点评，' +
  '没有标准答案，只有匹配场景的权衡。';

export interface DesignOption {
  id: string;
  name: string;
  desc: string;
  tradeoff: string; // 对照 Hermes 取舍的一句话点评
  hermesChoice?: boolean; // Hermes 自己的实际选择
}

export interface DesignDimension {
  id: string;
  title: string;
  question: string;
  options: DesignOption[];
}

export const DESIGN_DIMENSIONS: DesignDimension[] = [
  {
    id: 'loop',
    title: '循环形态',
    question: 'agent 的主循环怎么转？',
    options: [
      {
        id: 'sync-while',
        name: '同步 while 循环',
        desc: '一个 while 包住「调模型 → 执行工具 → 追加结果」，直到模型返回纯文本。',
        tradeoff: '按阶段推进便于追踪依赖；请求流式与符合条件的工具并行仍可发生在相应执行路径。',
        hermesChoice: true,
      },
      {
        id: 'event-driven',
        name: '事件驱动状态机',
        desc: '一切皆事件：llm.response、tool.result 进队列，状态机推进。',
        tradeoff: '适合事件协调，但要处理状态与顺序；不能仅由控制形式推断缓存一定更好或更差。',
      },
    ],
  },
  {
    id: 'tools',
    title: '工具面',
    question: '工具能力放在核心还是边缘？',
    options: [
      {
        id: 'narrow-core',
        name: '窄核心 + 插件边缘',
        desc: '核心工具极少且高门槛，新能力以插件/技能/toolset 形式长在边缘。',
        tradeoff: '未暴露能力不进入本次工具清单；启用并暴露的插件工具同样占输入空间。',
        hermesChoice: true,
      },
      {
        id: 'big-core',
        name: '大而全核心',
        desc: '所有工具内建于核心，开箱即用。',
        tradeoff:
          '上手快，但 schema 成本随工具数线性增长，模型注意力被稀释——Hermes 的 Contribution Rubric 直接拒绝这条路。',
      },
    ],
  },
  {
    id: 'memory',
    title: '记忆方案',
    question: '跨会话记忆怎么存？',
    options: [
      {
        id: 'sqlite-fts5',
        name: '内置记忆与本地历史',
        desc: 'MEMORY.md/USER.md 保存少量稳定事实；SQLite 历史由 session_search 按需读取。',
        tradeoff: '内置文件与历史不要求外部记忆服务；语义检索和用户建模可由可选 provider 扩展。',
        hermesChoice: true,
      },
      {
        id: 'hosted',
        name: '托管记忆服务',
        desc: '接 Honcho / mem0 这类外部服务，用户建模交给专业系统。',
        tradeoff:
          'Hermes 以 MemoryProvider 插件支持（honcho/mem0/supermemory 等）。换来 dialectic 用户建模，代价是网络依赖与数据出域。',
        hermesChoice: true,
      },
      {
        id: 'none',
        name: '不要记忆',
        desc: '每次会话从零开始。',
        tradeoff:
          '最简单也最隐私，但「会积累」这个核心差异就没了——想要这个形态，把 memory 加进 agent.disabled_toolsets 即可（例如刻意无状态的定时任务会话）。',
      },
    ],
  },
  {
    id: 'skills',
    title: '技能系统',
    question: '要不要自进化的技能？',
    options: [
      {
        id: 'self-evolving',
        name: '自创建 + 策展',
        desc: 'agent 从经验沉淀技能，后台 curator 跟踪使用、归档僵尸技能。',
        tradeoff:
          'Hermes 的选择。技能库会自我增值，但必须配套策展器与 pinned/归档不变量，否则 skill 列表腐烂成噪音。',
        hermesChoice: true,
      },
      {
        id: 'static',
        name: '静态技能库',
        desc: '只加载人工编写的技能，不自动创建。',
        tradeoff: '人工评审的技能可以通过明确修订持续改进，自动复盘是另一种更新方式。',
      },
      {
        id: 'none',
        name: '无技能',
        desc: '领域知识全写进系统提示。',
        tradeoff:
          '系统提示臃肿且每次调用全量付费；技能的价值正是按需加载、注入 user 消息不破缓存。',
      },
    ],
  },
  {
    id: 'deploy',
    title: '部署形态',
    question: 'agent 跑在哪里、怎么触达？',
    options: [
      {
        id: 'gateway',
        name: '网关多平台',
        desc: '单一 gateway 进程接 20+ 聊天平台，agent 跑在云端 VM。',
        tradeoff:
          'Hermes 的选择。设备不绑定笔记本，Telegram 一句话云端干活；代价是多一层适配与两道消息守卫的复杂度。',
        hermesChoice: true,
      },
      {
        id: 'local-cli',
        name: '本地 CLI',
        desc: '单进程命令行，人在哪 agent 在哪。',
        tradeoff: '最简单、延迟最低；但离开终端就失联——适合个人工具，不适合「随身 agent」。',
      },
      {
        id: 'serverless',
        name: 'Serverless 后端',
        desc: '执行环境放 Modal/Daytona，空闲休眠、任务唤醒。',
        tradeoff:
          'Hermes 支持（tools/environments/）。减少闲置计算，仍需核对存储与服务费用，代价是冷启动延迟与休眠/唤醒时序的复杂度。',
        hermesChoice: true,
      },
    ],
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const AGENT_DESIGN_INTRO_EN =
  'After M1 you have a complete parts diagram. This chapter turns it around: make a choice on each of five ' +
  'design dimensions, and the design card on the right accumulates into an agent design document in real time — ' +
  "every choice comes with commentary against Hermes' real trade-offs. " +
  'There are no standard answers, only trade-offs matched to the scenario.';

export const DESIGN_DIMENSIONS_EN: DesignDimension[] = [
  {
    id: 'loop',
    title: 'Loop shape',
    question: 'How does the agent loop turn?',
    options: [
      {
        id: 'sync-while',
        name: 'Synchronous while loop',
        desc: 'One while wraps "call model → execute tools → append results" until the model returns plain text.',
        tradeoff:
          'Ordered phases make dependencies explicit. Streaming and eligible concurrent tool batches still occur inside supported execution paths.',
        hermesChoice: true,
      },
      {
        id: 'event-driven',
        name: 'Event-driven state machine',
        desc: 'Everything is an event: llm.response and tool.result go into a queue, and a state machine advances.',
        tradeoff:
          'Useful for event coordination, with state and ordering complexity. Neither this nor a synchronous loop automatically guarantees better caching.',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tool surface',
    question: 'Do tool capabilities live in the core or at the edge?',
    options: [
      {
        id: 'narrow-core',
        name: 'Narrow core + plugin edge',
        desc: 'Very few core tools with a high bar; new capabilities grow at the edge as plugins/skills/toolsets.',
        tradeoff:
          'Unexposed capabilities avoid per-request definitions; enabled plugin tools still add schema input.',
        hermesChoice: true,
      },
      {
        id: 'big-core',
        name: 'Batteries-included core',
        desc: 'All tools built into the core, ready out of the box.',
        tradeoff:
          "Fast to get started, but schema cost grows linearly with tool count and the model's attention gets diluted — Hermes' Contribution Rubric rejects this path outright.",
      },
    ],
  },
  {
    id: 'memory',
    title: 'Memory scheme',
    question: 'How is cross-session memory stored?',
    options: [
      {
        id: 'sqlite-fts5',
        name: 'Local memory and history',
        desc: 'Bounded MEMORY.md/USER.md snapshots plus SQLite history retrieved by session_search.',
        tradeoff:
          'No external memory service is needed for built-in files and history; semantic providers are optional.',
        hermesChoice: true,
      },
      {
        id: 'hosted',
        name: 'Hosted memory service',
        desc: 'Plug into external services like Honcho / mem0, leaving user modeling to specialized systems.',
        tradeoff:
          'Hermes supports this via MemoryProvider plugins (honcho/mem0/supermemory, etc.). You gain dialectic user modeling at the cost of network dependency and data leaving your domain.',
        hermesChoice: true,
      },
      {
        id: 'none',
        name: 'No memory',
        desc: 'Every session starts from scratch.',
        tradeoff:
          'Simplest and most private, but the core differentiator of "accumulating" is gone — to get this shape, add memory to agent.disabled_toolsets (e.g. deliberately stateless scheduled-job sessions).',
      },
    ],
  },
  {
    id: 'skills',
    title: 'Skill system',
    question: 'Do you want self-evolving skills?',
    options: [
      {
        id: 'self-evolving',
        name: 'Self-creation + curation',
        desc: 'The agent distills skills from experience while a background curator tracks usage and archives zombie skills.',
        tradeoff:
          "Hermes' choice. The skill library appreciates by itself, but it must come with a curator and pinned/archive invariants, or the skill list rots into noise.",
        hermesChoice: true,
      },
      {
        id: 'static',
        name: 'Static skill library',
        desc: 'Only load hand-written skills; no automatic creation.',
        tradeoff:
          'Human-reviewed skills can improve through deliberate revisions; automatic review is another update path.',
      },
      {
        id: 'none',
        name: 'No skills',
        desc: 'All domain knowledge goes into the system prompt.',
        tradeoff:
          'A bloated system prompt you pay for in full on every call; the value of skills is precisely on-demand loading, injected into user messages without breaking the cache.',
      },
    ],
  },
  {
    id: 'deploy',
    title: 'Deployment shape',
    question: 'Where does the agent run, and how do you reach it?',
    options: [
      {
        id: 'gateway',
        name: 'Multi-platform gateway',
        desc: 'A single gateway process fronts 20+ chat platforms; the agent runs on a cloud VM.',
        tradeoff:
          "Hermes' choice. Not tied to a laptop — one Telegram message gets work done in the cloud; the cost is an extra adaptation layer and the complexity of two message guards.",
        hermesChoice: true,
      },
      {
        id: 'local-cli',
        name: 'Local CLI',
        desc: 'A single-process command line; the agent is wherever you are.',
        tradeoff:
          'Simplest with the lowest latency, but you lose contact away from the terminal — fine for a personal tool, not for a "carry-everywhere agent".',
      },
      {
        id: 'serverless',
        name: 'Serverless backend',
        desc: 'Execution environments on Modal/Daytona: dormant when idle, woken by tasks.',
        tradeoff:
          'Supported by Hermes (tools/environments/). Reduced idle compute with service-specific storage and resource charges, at the price of cold-start latency and sleep/wake timing complexity.',
        hermesChoice: true,
      },
    ],
  },
];

// 本章专属 UI 文案（设计卡、选项徽标、收束段等）
export const AGENT_DESIGN_UI = {
  hermesChoiceBadge: { zh: '◆ Hermes 之选', en: "◆ Hermes' choice" },
  cardTitle: { zh: '我的 Agent 设计', en: 'My Agent Design' },
  cardEmpty: {
    zh: '在左侧做出设计选择，这张卡会实时累成你的 agent 设计文档。',
    en: 'Make design choices on the left, and this card accumulates into your agent design document in real time.',
  },
  cardComplete: {
    zh: '✓ 五个维度都有决断了——这就是一份最小可行的 agent 设计文档。回到 M1 对照每个决策在 Hermes 里的实现，你就拥有了面试系统设计题的全套素材。',
    en: '✓ All five dimensions decided — this is a minimum viable agent design document. Go back to M1 and match each decision against its implementation in Hermes, and you have the full material for system-design interview questions.',
  },
  closingKicker: { zh: '收束', en: 'Wrap-up' },
  closingTitle: { zh: '设计即权衡', en: 'Design is trade-offs' },
  closingBody: {
    zh: '注意「◆ Hermes 之选」并不是唯一正确答案：本地 CLI 部署对单人工具完全合理，静态技能库对合规场景更合适。 面试中加分项从来不是背出 Hermes 的答案，而是说清每个维度的候选、代价与触发条件——这张设计卡就是你的答题骨架。',
    en: 'Note that "◆ Hermes\' choice" is not the only correct answer: local CLI deployment is perfectly reasonable for a single-user tool, and a static skill library fits compliance-heavy scenarios better. What earns points in an interview is never reciting Hermes\' answers, but articulating the candidates, costs, and trigger conditions of each dimension — this design card is your answer skeleton.',
  },
};
