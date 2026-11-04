// Chapter 25「系统设计面试」数据源：Design Doc 六节模板。
// 「Hermes 对应实例」全部对齐 AGENTS.md 的真实设计：
// §AIAgent Class（构造参数即需求参数化）、§Prompt Caching、§Adding New Tools（注册≠暴露）、
// §Cron（600s 不活动看门狗）、§Kanban（failure_limit 自动 block）、§Delegation（进程级隔离）、
// §Curator（遥测驱动技能生命周期）。

export interface DesignDocSection {
  id: string;
  title: string;
  interviewerWants: string[]; // 面试官想听什么
  hermesExample: string; // Hermes 对应实例
  placeholder: string; // textarea 引导语
}

export const DESIGN_DOC_INTRO =
  '「设计一个 AI agent 系统」是系统设计面试的常客。面试官不指望你现场写代码，' +
  '而是看你能不能在 40 分钟里交出一份结构完整的 Design Doc：先把需求问清楚，再自上而下展开，' +
  '最后在故障与评测上体现工程成熟度。下面六个小节是这份文档的骨架——' +
  '每节先告诉你面试官想听什么、给出 Hermes 里的真实实例，然后展开输入区写下你自己的答案要点。' +
  '写下的内容会自动保存。';

export const DESIGN_DOC_SECTIONS: DesignDocSection[] = [
  {
    id: 'requirements',
    title: '① 需求澄清',
    interviewerWants: [
      '先问再答：用户是谁、任务类型（对话式 / 批处理 / 定时）、规模与延迟约束',
      '成本与配额：token 预算、单任务迭代上限、可接受的缓存策略',
      '明确不做什么：划清边界比堆功能更加分',
    ],
    hermesExample:
      '先声明用户、任务、运行入口、数据位置与验收，再选择模型与工具。不同入口和 profile 有不同配置，不能用一个构造参数默认值概括全部运行形态。',
    placeholder:
      '例：面向开发者的 CLI agent，单会话交互；预算敏感（要 prompt caching）；暂不考虑多租户 SaaS……',
  },
  {
    id: 'architecture',
    title: '② 高层架构',
    interviewerWants: [
      '一张能说清的图：输入 → 上下文组装 → 模型 → 工具 → 结果回写 → 循环 / 返回',
      '同步边界画在哪里：什么是循环内的，什么是循环外的',
      '会话结束后发生什么：持久化、记忆同步、后台系统',
    ],
    hermesExample:
      '主回合按依赖推进，支持模型流式与符合条件的工具并行。持久化、回合同步、后台复盘和空闲策展有不同的触发与生命周期。',
    placeholder: '画出你的架构分层：主循环 / 显示层 / 持久化 / 后台系统，标出同步与异步边界……',
  },
  {
    id: 'components',
    title: '③ 组件设计',
    interviewerWants: [
      '关键抽象与接口：工具、provider、记忆各自长什么样、能不能替换',
      '注册与暴露是否分离：能力注册了，不等于要对 agent 可见',
      '扩展点在哪：不动核心代码能不能加能力（插件、钩子）',
    ],
    hermesExample:
      '工具注册不等于暴露；schema、handler、toolset 与会话条件共同决定工具面。模型有不同 API 路径，外部记忆实现 MemoryProvider 接口。插件通过公共扩展面接入。',
    placeholder: '列出你的核心组件：工具注册表、provider 适配层、记忆接口……各自的替换成本是什么？',
  },
  {
    id: 'data-state',
    title: '④ 数据与状态',
    interviewerWants: [
      '消息流怎么组织：追加还是改写？缓存策略是什么？',
      '状态存哪：会话、配置、遥测各自的存储与生命周期',
      '多实例 / 多租户怎么隔离',
    ],
    hermesExample:
      '分别列出当前消息、内置记忆快照、会话数据库、技能包和活动记录。按所属 profile 绑定读写，明确显式跨范围访问，不用一个全局常量代表所有会话。',
    placeholder:
      '写明你的状态清单：消息流（append-only？）、会话库、配置、遥测，以及各自的隔离边界……',
  },
  {
    id: 'failure',
    title: '⑤ 故障与边界',
    interviewerWants: [
      '失控防护：迭代上限、超时、死循环怎么断',
      '重试与熔断：失败多少次就该停，停了之后怎么办',
      '隔离级别：子任务故障能不能拖垮主流程',
    ],
    hermesExample:
      '按故障选择重试、修正、限时、预算与副作用核对。内置子 agent 可在线程池中运行：独立上下文不是进程或文件系统隔离。',
    placeholder:
      '逐条列出你的防线：迭代上限 / 超时 / 重试熔断 / 隔离 / 降级，每条给出具体数值或机制……',
  },
  {
    id: 'evaluation',
    title: '⑥ 评测与迭代',
    interviewerWants: [
      '怎么知道系统变好了：成功指标、质量指标、成本指标',
      '遥测怎么设计：记录什么、在哪记录、谁来消费',
      '迭代机制：数据怎么回流成改进',
    ],
    hermesExample:
      '固定模型、输入和配置，核对结果、异常处理、时间与成本。技能活动不是准确率；用未参与修订的变式验证学习效果。',
    placeholder: '定义你的指标与回流路径：用什么数据判断好坏，数据怎么驱动下一轮改进……',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const DESIGN_DOC_INTRO_EN =
  '"Design an AI agent system" is a system-design interview staple. Interviewers don\'t expect you to write ' +
  'code on the spot — they want to see whether you can deliver a structurally complete design doc in 40 ' +
  'minutes: clarify requirements first, then expand top-down, and finally show engineering maturity on ' +
  'failures and evaluation. The six sections below are the skeleton of that document — each one first tells ' +
  'you what the interviewer wants to hear and gives a real Hermes example, then opens an input area for your ' +
  'own answer notes. What you write is saved automatically.';

export const DESIGN_DOC_SECTIONS_EN: DesignDocSection[] = [
  {
    id: 'requirements',
    title: '① Requirements Clarification',
    interviewerWants: [
      'Ask before answering: who the users are, task types (conversational / batch / scheduled), scale and latency constraints',
      'Cost and quotas: token budget, per-task iteration cap, acceptable caching strategy',
      'Be explicit about non-goals: drawing boundaries scores higher than piling on features',
    ],
    hermesExample:
      'State users, tasks, entry points, data, and acceptance before selecting models and tools. Configuration depends on runtime and profile.',
    placeholder:
      'e.g. a CLI agent for developers, single-session interaction; budget-sensitive (needs prompt caching); no multi-tenant SaaS for now……',
  },
  {
    id: 'architecture',
    title: '② High-Level Architecture',
    interviewerWants: [
      'A diagram you can explain: input → context assembly → model → tools → result write-back → loop / return',
      'Where the synchronous boundary sits: what is inside the loop, what is outside',
      'What happens after the session ends: persistence, memory sync, background systems',
    ],
    hermesExample:
      'Ordered turns coexist with streaming and eligible tool concurrency. Persistence, synchronization, review, and idle maintenance have different lifecycles.',
    placeholder:
      'Sketch your architecture layers: main loop / display layer / persistence / background systems — mark the sync and async boundaries……',
  },
  {
    id: 'components',
    title: '③ Component Design',
    interviewerWants: [
      'Key abstractions and interfaces: what tools, providers, and memory look like, and whether they are replaceable',
      'Whether registration and exposure are separated: a capability being registered does not mean it must be visible to the agent',
      'Where the extension points are: can you add capabilities without touching core code (plugins, hooks)',
    ],
    hermesExample:
      'Registration differs from exposure. Schema, handler, toolsets, and session conditions interact. Models use several API paths; memory providers and plugins have defined interfaces.',
    placeholder:
      'List your core components: tool registry, provider adapter layer, memory interface… What is the replacement cost of each?',
  },
  {
    id: 'data-state',
    title: '④ Data & State',
    interviewerWants: [
      'How the message stream is organized: append or rewrite? What is the caching strategy?',
      'Where state lives: storage and lifecycle of sessions, config, and telemetry',
      'How multi-instance / multi-tenant isolation works',
    ],
    hermesExample:
      'List live messages, snapshots, history, skill packages, and activity records separately. Bind access to the owner profile and distinguish explicit cross-scope reads.',
    placeholder:
      'Write out your state inventory: message stream (append-only?), session store, config, telemetry — and the isolation boundary of each……',
  },
  {
    id: 'failure',
    title: '⑤ Failure & Boundaries',
    interviewerWants: [
      'Runaway protection: iteration caps, timeouts, how to break dead loops',
      'Retry and circuit-breaking: how many failures mean stop, and what happens after stopping',
      'Isolation levels: can a subtask failure drag down the main flow',
    ],
    hermesExample:
      'Match failure handling to the fault. Built-in children can run in a thread pool: separate context does not imply separate process or filesystem.',
    placeholder:
      'List your defenses one by one: iteration cap / timeout / retry & circuit-breaking / isolation / degradation — give a concrete number or mechanism for each……',
  },
  {
    id: 'evaluation',
    title: '⑥ Evaluation & Iteration',
    interviewerWants: [
      'How you know the system is improving: success metrics, quality metrics, cost metrics',
      'How telemetry is designed: what to record, where, and who consumes it',
      'Iteration mechanism: how data flows back into improvements',
    ],
    hermesExample:
      'Hold model, inputs, and configuration fixed. Check results, failures, latency, and cost. Activity is not accuracy; evaluate revisions on unseen variations.',
    placeholder:
      'Define your metrics and feedback loop: what data tells good from bad, and how data drives the next round of improvement……',
  },
];

// ── 实验室专属 UI 文案（DesignDocLab） ────────────────────────────

export const DESIGN_DOC_UI = {
  completionLabel: { zh: '文档完成度', en: 'Doc completion' },
  filledSuffix: { zh: '节已填写', en: 'sections filled' },
  filled: { zh: '✓ 已填写', en: '✓ Filled' },
  interviewerWants: { zh: '面试官想听什么', en: 'WHAT THE INTERVIEWER WANTS TO HEAR' },
  hermesExample: { zh: 'HERMES 对应实例', en: 'HERMES EXAMPLE' },
  expand: { zh: '▼ 展开，写下我的答案要点', en: '▼ Expand and write your answer notes' },
  collapse: { zh: '▲ 收起（内容已自动保存）', en: '▲ Collapse (saved automatically)' },
};
