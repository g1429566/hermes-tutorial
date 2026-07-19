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
        tradeoff:
          'Hermes 的选择。简单、可单步调试、中断只是循环条件；代价是并发要靠委派另起循环，而不是在循环里异步。',
        hermesChoice: true,
      },
      {
        id: 'event-driven',
        name: '事件驱动状态机',
        desc: '一切皆事件：llm.response、tool.result 进队列，状态机推进。',
        tradeoff:
          '天然支持并发与可视化追踪，但状态机复杂度爆炸，prompt 缓存的前缀稳定性更难保证——Hermes 只在网关层用事件，循环本体保持同步。',
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
        tradeoff:
          'Hermes 的选择（narrow waist）。每个核心工具每次 API 调用都占 schema 体积；插件 toolset 可启停，schema 占用为零。',
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
        name: '自建 SQLite + FTS5',
        desc: '会话落本地 SQLite，FTS5 全文索引，LLM 摘要做跨会话召回。',
        tradeoff:
          'Hermes 的选择（hermes_state.py SessionDB）。零外部依赖、离线可用；代价是语义检索要靠摘要而不是向量。',
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
          '最简单也最隐私，但「会积累」这个核心差异就没了——cron 会话正是刻意 skip_memory=True 的这个形态。',
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
        tradeoff: '可控、可评审，但 agent 不会变聪明——等于砍掉了学习循环的一半。',
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
          'Hermes 支持（tools/environments/）。闲置近零成本，代价是冷启动延迟与休眠/唤醒时序的复杂度。',
        hermesChoice: true,
      },
    ],
  },
];
