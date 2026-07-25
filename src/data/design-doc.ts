// Chapter 25「系统设计面试」数据源：Design Doc 六节模板。
// 「Hermes 对应实例」全部对齐 AGENTS.md 的真实设计：
// §AIAgent Class（构造参数即需求参数化）、§Prompt Caching、§Adding New Tools（注册≠暴露）、
// §Cron（3 分钟硬中断）、§Kanban（failure_limit 自动 block）、§Delegation（进程级隔离）、
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
      'Hermes 用 platform 构造参数（"cli" / "telegram" / …）区分接入形态，每个平台选自己的基础 toolset；' +
      'max_iterations=90、iteration_budget、quiet_mode、save_trajectories 等约 60 个构造参数，' +
      '本质就是把「需求」参数化——同一个 agent 内核，按场景装配出不同形态。',
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
      'Hermes 的心脏是 run_conversation() 里一个同步 while 循环（AGENTS.md 原话：entirely synchronous），' +
      '流式与动画全在显示层；循环之外才有 gateway 多平台接入、SessionDB 落盘（SQLite + FTS5）、' +
      'on_session_end 钩子触发的记忆同步，以及 curator / cron 这类后台系统。',
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
      'Hermes 的 tools/registry.py 自动发现（import 即注册），但必须登记进 toolsets.py 的 TOOLSETS 才会暴露给 agent' +
      '——registration ≠ exposure，schema footprint 是刻意控制的成本。provider 以插件形式统一成 ' +
      'chat.completions 一种形状；记忆后端实现 MemoryProvider ABC（sync_turn / prefetch / shutdown）；' +
      '通用插件只能挂生命周期钩子（pre_tool_call 等），不许改核心文件。',
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
      'Hermes 的消息流只 append 不改写——prompt cache 铁律禁止中途改历史 / 换 toolset / 重建 system prompt，' +
      '唯一例外是 context compression。会话落 SessionDB（SQLite + FTS5 可全文搜索）；技能遥测是 ' +
      '~/.hermes/skills/.usage.json sidecar；所有状态锚在 get_hermes_home()，profile 之间完全隔离。',
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
      'Hermes 的防线层层可数：max_iterations=90 与子 agent 共享防失控；预算耗尽仍有 one-turn grace call 体面收尾；' +
      'cron 会话 3 分钟硬中断，失控任务拖不死调度器；kanban 同一任务连续失败（默认 2 次）自动 block 防空转；' +
      '委派是进程级隔离——子 agent 有独立上下文与 terminal session，配 child_timeout_seconds；' +
      'fallback_model 与 credential_pool 处理 provider 单点故障。',
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
      'Hermes 的 curator 是遥测驱动生命周期的样板：.usage.json 记录每个技能的 use_count / view_count / ' +
      'last_activity_at，stale_after_days 与 archive_after_days 到期自动转 stale / archive——' +
      '不删除，只归档，pinned 豁免。会话经 FTS5 全文索引支撑 session_search 复盘；' +
      'save_trajectories 保存完整轨迹供离线分析。',
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
      'Hermes uses the platform constructor parameter ("cli" / "telegram" / …) to distinguish integration ' +
      'forms, and each platform picks its own base toolset; some 60 constructor parameters — ' +
      'max_iterations=90, iteration_budget, quiet_mode, save_trajectories — are essentially requirements ' +
      'turned into parameters: one agent kernel, assembled into different forms per scenario.',
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
      "Hermes' heart is a synchronous while loop in run_conversation() (AGENTS.md's own words: entirely " +
      'synchronous), with streaming and animation all in the display layer; outside the loop sit the ' +
      "gateway's multi-platform ingress, SessionDB persistence (SQLite + FTS5), memory sync triggered by " +
      'the on_session_end hook, and background systems like curator / cron.',
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
      "Hermes' tools/registry.py auto-discovers (import registers), but a tool is only exposed to the agent " +
      "once listed in toolsets.py's TOOLSETS — registration ≠ exposure, and schema footprint is a " +
      'deliberately controlled cost. Providers are unified as plugins into a single chat.completions shape; ' +
      'memory backends implement the MemoryProvider ABC (sync_turn / prefetch / shutdown); generic plugins ' +
      'may only attach lifecycle hooks (pre_tool_call etc.) and may not modify core files.',
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
      "Hermes' message stream only appends, never rewrites — the prompt-cache iron rule forbids mid-session " +
      'history edits / toolset swaps / system-prompt rebuilds, with context compression as the sole ' +
      'exception. Sessions land in SessionDB (SQLite + FTS5, full-text searchable); skill telemetry is the ' +
      '~/.hermes/skills/.usage.json sidecar; all state anchors at get_hermes_home(), with profiles fully ' +
      'isolated from each other.',
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
      "Hermes' lines of defense are enumerable: max_iterations=90 shared with subagents against runaway; a " +
      'one-turn grace call wraps up gracefully even after the budget runs out; cron sessions get a 3-minute ' +
      "hard interrupt so runaway jobs can't kill the scheduler; kanban auto-blocks a task after consecutive " +
      'failures (default 2) against spinning; delegation is process-level isolation — subagents get their ' +
      'own context and terminal session, with child_timeout_seconds; fallback_model and credential_pool ' +
      'handle provider single points of failure.',
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
      "Hermes' curator is the model of a telemetry-driven lifecycle: .usage.json records each skill's " +
      'use_count / view_count / last_activity_at, and stale_after_days / archive_after_days automatically ' +
      'transition skills to stale / archive on expiry — archived, never deleted, with pinned exempt. ' +
      'Sessions are full-text indexed via FTS5 to power session_search retrospectives; save_trajectories ' +
      'keeps full trajectories for offline analysis.',
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
