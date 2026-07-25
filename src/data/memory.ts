// Chapter 08「记忆与跨会话召回」数据源：四层记忆架构。
// 内容对齐 hermes-agent/AGENTS.md 的「Per-conversation prompt caching is sacred」
// 「Memory-provider plugins」「Skills」「Curator」各节，以及 hermes_state.py
// （SessionDB + FTS5）、agent/memory_provider.py（MemoryProvider ABC）、
// agent/memory_manager.py、agent/title_generator.py、tools/session_search_tool.py
// 的真实实现。

export interface MemoryLayer {
  id: 'working' | 'episodic' | 'semantic' | 'procedural';
  name: string; // 中文名
  latin: string; // 英文层名
  tagline: string;
  lifecycle: string; // 生命周期
  stores: string[]; // 存什么
  writes: string; // 何时写
  reads: string; // 何时读
  impl: { path: string; note: string }[]; // Hermes 对应实现
  cautions: string[]; // 注意事项
}

export const MEMORY_INTRO =
  '「记忆」在 Hermes 里不是一个组件，而是四层各就各位的架构：正在进行的对话是 Working 层，' +
  '落盘的会话历史是 Episodic 层，跨会话的用户画像是 Semantic 层，而「怎么做事」的知识沉进技能系统成为 ' +
  'Procedural 层。切换下面四层，看每一层的生命周期、读写时机，以及它在仓库里的真实落脚点。';

export const MEMORY_LAYERS: MemoryLayer[] = [
  {
    id: 'working',
    name: '工作记忆',
    latin: 'Working',
    tagline: '当前会话的 messages 数组',
    lifecycle:
      '随会话而生，随进程而终。整个生命周期就是 run_conversation() 里那个 while 循环：' +
      '会话结束时它不落盘——落盘是 Episodic 层的事。',
    stores: [
      'system prompt + 工具 schema（会话开始时组装一次）',
      'user / assistant / tool 三种角色的消息（OpenAI 格式）',
      '模型的 reasoning 内容（存在 assistant_msg["reasoning"]）',
    ],
    writes:
      '每一轮：模型回复与工具结果以 append 方式追加——只追加，永不改写历史消息。' +
      '唯一被允许的变更是上下文压缩（context compression）。',
    reads:
      '每一次模型调用：整个 messages 数组随请求发出，后续轮次复用缓存前缀（per-conversation prompt caching）。',
    impl: [
      { path: 'run_agent.py', note: 'AIAgent.run_conversation() 的主循环与消息流' },
      { path: 'AGENTS.md §Core Invariants', note: '「Per-conversation prompt caching is sacred」' },
    ],
    cautions: [
      'prompt cache 是圣物：中途不换工具集、不重建 system prompt、不改写历史——缓存一破，成本翻倍',
      '技能斜杠命令注入为 user 消息而非 system prompt，正是为了不破缓存',
      '超长会话靠压缩续命，不靠截断丢消息',
    ],
  },
  {
    id: 'episodic',
    name: '情景记忆',
    latin: 'Episodic',
    tagline: 'SessionDB：SQLite + FTS5 的会话档案',
    lifecycle:
      '跨会话持久。会话从开始到结束的每一条消息都写入本地 SQLite（profile 隔离的 ~/.hermes 下），' +
      'FTS5 索引同步维护——这是「上周我让你改的那个 bug」能被找回来的基础。',
    stores: [
      'sessions 表：来源、模型、起止时间、token 统计、标题等元数据',
      '全部消息原文 + FTS5 全文索引（messages_fts；另有 trigram 表支持 CJK 子串搜索）',
      '首轮交换后由辅助 LLM 异步生成的会话标题（agent/title_generator.py，不阻塞回复）',
    ],
    writes:
      '会话进行中持续写入；标题在第一轮应答交付后由后台线程生成并 _persist_session_title() 落库。',
    reads:
      'agent 通过 session_search 工具召回：discovery（FTS5 检索 + 去重 + 上下文窗口）、' +
      'scroll（锚点前后翻页）、browse（按时间浏览）三种模式——全程零 LLM 调用，返回的都是库里的真实消息。',
    impl: [
      { path: 'hermes_state.py', note: 'SessionDB —— SQLite session store（FTS5 search）' },
      { path: 'tools/session_search_tool.py', note: '跨会话召回工具，挂在 session_search toolset' },
      { path: 'agent/title_generator.py', note: '首轮交换后自动生成 3-7 词会话标题' },
    ],
    cautions: [
      'subagent 与第三方工具来源的会话默认隐藏；cron 会话在检索里降权（防止定时任务淹没交互会话）',
      'FTS5 不可用时（极少数 SQLite 构建）降级为无全文搜索，并打印一次告警',
      '召回结果直接给原文窗口，不做 LLM 摘要——摘要只出现在「标题」这一处',
    ],
  },
  {
    id: 'semantic',
    name: '语义记忆 · 用户模型',
    latin: 'Semantic',
    tagline: 'MemoryProvider 插件（Honcho dialectic modeling 等）',
    lifecycle:
      '跨会话、由外部后端持有。内置 provider 有 honcho、mem0、supermemory、byterover、hindsight、' +
      'holographic、openviking、retaindb 八个；config.yaml 的 memory.provider 指定当前激活者，' +
      'MemoryManager 统一编排。',
    stores: [
      '用户画像与长期事实：偏好、身份、项目背景（Honcho：dialectic Q&A、peer cards、conclusions）',
      '由 provider 后端自行索引的语义内容（向量 / 图 / 关系库，实现各异）',
    ],
    writes:
      '每轮对话结束后 sync_turn(user_content, assistant_content)——要求非阻塞，' +
      '慢后端应入队后台处理；进程退出时 shutdown() 冲刷队列、关闭连接。',
    reads:
      '每次模型调用前 prefetch(query)：返回一段格式化文本注入上下文，没有相关内容就返回空串。' +
      '实现要快——真实召回放后台线程，prefetch 只取缓存结果。',
    impl: [
      {
        path: 'agent/memory_provider.py',
        note: 'MemoryProvider ABC：prefetch / sync_turn / shutdown / post_setup',
      },
      { path: 'agent/memory_manager.py', note: 'MemoryManager 编排全部 provider 实例' },
      { path: 'plugins/memory/honcho/', note: 'Honcho：跨会话用户建模 + dialectic Q&A' },
    ],
    cautions: [
      'in-tree memory provider 集合已关闭（2026 年 5 月政策）：新后端必须发独立插件仓库，实现同一个 ABC',
      '技能脚手架消息会被剥壳后再存入——provider 拿到的是用户真实指令，不是整份 SKILL.md',
      '只有激活的 provider 才会暴露她的 CLI 子命令（hermes <plugin>），disabled 的不污染 --help',
    ],
  },
  {
    id: 'procedural',
    name: '程序性记忆',
    latin: 'Procedural',
    tagline: '技能系统：会做事的知识',
    lifecycle:
      '文件级持久，由策展器后台维护。agent 用 skill_manage 把「这次摸索出来的做法」写成技能；' +
      '30 天不用标 stale、90 天归档（可恢复）；pinned 技能永远豁免。',
    stores: [
      'SKILL.md：frontmatter（元数据）+ 正文（操作步骤、陷阱、验收方法）',
      'scripts/ 辅助脚本、references/ 参考资料、templates/ 模板',
      '.usage.json 遥测：use_count / last_activity_at / state / pinned',
    ],
    writes:
      'agent 通过 skill_manage 创建或修补技能时写入 ~/.hermes/skills/；' +
      'agent 创建的技能会被标记 created_by: "agent"——这是策展器唯一有权管理的集合。',
    reads:
      '两种读法：用户敲 /skill-name 斜杠命令，把技能正文注入为 user 消息；' +
      '或 agent 主动调 skills_list / skill_view 查看技能内容。',
    impl: [
      { path: 'skills/ + ~/.hermes/skills/', note: '内置技能目录与用户级技能目录' },
      { path: 'tools/skills_tool.py', note: 'skills_list / skill_view / skill_manage 三工具' },
      { path: 'agent/curator.py', note: '策展器：stale / archive 自动流转 + LLM 评审' },
    ],
    cautions: [
      '程序性记忆 = 第 05/06 章的主题，这里只记一句：技能就是 Hermes 的「肌肉记忆」',
      '技能改动默认下次会话生效——立刻生效要破 prompt cache，代价自负',
      '策展器只归档不删除，归档在 ~/.hermes/skills/.archive/ 可恢复',
    ],
  },
];

export const MEMORY_HOOK =
  'Working 管当下，Episodic 管「发生过什么」，Semantic 管「你是谁」，Procedural 管「怎么做」。' +
  '四层共用一条军规：写入绝不破坏正在进行的对话缓存。';

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const MEMORY_INTRO_EN =
  '"Memory" in Hermes is not a single component but a four-layer architecture, each layer in its ' +
  'place: the live conversation is the Working layer, the on-disk session history is the Episodic ' +
  'layer, the cross-session user profile is the Semantic layer, and "how to do things" sinks into ' +
  "the skill system as the Procedural layer. Switch between the four layers below to see each one's " +
  'lifecycle, read/write timing, and where it actually lives in the repo.';

export const MEMORY_LAYERS_EN: MemoryLayer[] = [
  {
    id: 'working',
    name: 'Working memory',
    latin: 'Working',
    tagline: 'The messages array of the current session',
    lifecycle:
      'Born with the session, ends with the process. Its whole lifecycle is the while loop in ' +
      'run_conversation(): when the session ends it is not persisted — persistence is the ' +
      "Episodic layer's job.",
    stores: [
      'system prompt + tool schemas (assembled once at session start)',
      'user / assistant / tool role messages (OpenAI format)',
      'the model\'s reasoning content (stored in assistant_msg["reasoning"])',
    ],
    writes:
      'Every turn: model replies and tool results are appended — append only, history messages ' +
      'are never rewritten. The only permitted mutation is context compression.',
    reads:
      'Every model call: the entire messages array is sent with the request, and later turns ' +
      'reuse the cached prefix (per-conversation prompt caching).',
    impl: [
      { path: 'run_agent.py', note: 'AIAgent.run_conversation() main loop and message flow' },
      { path: 'AGENTS.md §Core Invariants', note: '"Per-conversation prompt caching is sacred"' },
    ],
    cautions: [
      'The prompt cache is sacred: never swap the toolset mid-session, never rebuild the system ' +
        'prompt, never rewrite history — break the cache and the cost doubles',
      'Skill slash commands are injected as user messages rather than into the system prompt, ' +
        'precisely to keep the cache intact',
      'Overlong sessions survive on compression, not on truncating messages',
    ],
  },
  {
    id: 'episodic',
    name: 'Episodic memory',
    latin: 'Episodic',
    tagline: 'SessionDB: a SQLite + FTS5 session archive',
    lifecycle:
      'Persistent across sessions. Every message from start to end of a session is written to ' +
      'local SQLite (profile-isolated under ~/.hermes), with the FTS5 index maintained in sync — ' +
      'this is what makes "the bug I asked you to fix last week" retrievable.',
    stores: [
      'sessions table: source, model, start/end time, token stats, title and other metadata',
      'full message bodies + FTS5 full-text index (messages_fts; a trigram table supports CJK substring search)',
      'session titles generated asynchronously by a helper LLM after the first exchange (agent/title_generator.py, does not block the reply)',
    ],
    writes:
      'Written continuously while the session runs; the title is generated by a background thread ' +
      'after the first reply is delivered and persisted via _persist_session_title().',
    reads:
      'The agent recalls via the session_search tool: discovery (FTS5 retrieval + dedup + context ' +
      'window), scroll (paging around an anchor), and browse (by time) — zero LLM calls end to end; ' +
      'everything returned is a real message from the store.',
    impl: [
      { path: 'hermes_state.py', note: 'SessionDB — SQLite session store (FTS5 search)' },
      {
        path: 'tools/session_search_tool.py',
        note: 'cross-session recall tool, mounted on the session_search toolset',
      },
      {
        path: 'agent/title_generator.py',
        note: 'auto-generates a 3-7 word session title after the first exchange',
      },
    ],
    cautions: [
      'Sessions from subagents and third-party tools are hidden by default; cron sessions are ' +
        "down-ranked in search (so scheduled jobs don't drown interactive sessions)",
      'When FTS5 is unavailable (rare SQLite builds) it degrades to no full-text search and prints ' +
        'a one-time warning',
      'Recall returns raw message windows, no LLM summary — summarization happens only in the "title"',
    ],
  },
  {
    id: 'semantic',
    name: 'Semantic memory · user model',
    latin: 'Semantic',
    tagline: 'MemoryProvider plugins (Honcho dialectic modeling, etc.)',
    lifecycle:
      'Cross-session, held by an external backend. Built-in providers: honcho, mem0, supermemory, ' +
      'byterover, hindsight, holographic, openviking, retaindb — eight in total. memory.provider ' +
      'in config.yaml selects the active one; MemoryManager orchestrates them all.',
    stores: [
      'User profile and long-term facts: preferences, identity, project background (Honcho: dialectic Q&A, peer cards, conclusions)',
      'Semantic content indexed by the provider backend itself (vectors / graphs / relational stores, implementation varies)',
    ],
    writes:
      'sync_turn(user_content, assistant_content) after each conversation turn — must be ' +
      'non-blocking; slow backends should enqueue for background processing. On process exit, ' +
      'shutdown() flushes the queue and closes connections.',
    reads:
      'prefetch(query) before each model call: returns a formatted text block injected into the ' +
      'context, or an empty string when nothing is relevant. Must be fast — real recall runs on a ' +
      'background thread; prefetch only picks up cached results.',
    impl: [
      {
        path: 'agent/memory_provider.py',
        note: 'MemoryProvider ABC: prefetch / sync_turn / shutdown / post_setup',
      },
      {
        path: 'agent/memory_manager.py',
        note: 'MemoryManager orchestrates all provider instances',
      },
      {
        path: 'plugins/memory/honcho/',
        note: 'Honcho: cross-session user modeling + dialectic Q&A',
      },
    ],
    cautions: [
      'The in-tree memory provider collection is closed (May 2026 policy): new backends must ship ' +
        'as standalone plugin repos implementing the same ABC',
      "Skill scaffold messages are stripped before storage — the provider receives the user's " +
        'real instruction, not the whole SKILL.md',
      "Only the active provider exposes its CLI subcommand (hermes <plugin>); disabled ones don't " +
        'pollute --help',
    ],
  },
  {
    id: 'procedural',
    name: 'Procedural memory',
    latin: 'Procedural',
    tagline: 'The skill system: knowledge of how to do things',
    lifecycle:
      'File-level persistence, maintained in the background by the curator. The agent uses ' +
      'skill_manage to write "the approach figured out this time" into a skill; 30 days unused ' +
      'marks it stale, 90 days archives it (recoverable); pinned skills are always exempt.',
    stores: [
      'SKILL.md: frontmatter (metadata) + body (steps, pitfalls, acceptance criteria)',
      'scripts/ helper scripts, references/ reference material, templates/ templates',
      '.usage.json telemetry: use_count / last_activity_at / state / pinned',
    ],
    writes:
      'Written to ~/.hermes/skills/ when the agent creates or patches a skill via skill_manage; ' +
      'agent-created skills are marked created_by: "agent" — the only collection the curator is ' +
      'allowed to manage.',
    reads:
      'Two read paths: the user types a /skill-name slash command to inject the skill body as a ' +
      'user message; or the agent actively calls skills_list / skill_view to inspect skill content.',
    impl: [
      {
        path: 'skills/ + ~/.hermes/skills/',
        note: 'built-in skill directory and user-level skill directory',
      },
      {
        path: 'tools/skills_tool.py',
        note: 'the three tools: skills_list / skill_view / skill_manage',
      },
      {
        path: 'agent/curator.py',
        note: 'the curator: automatic stale / archive transitions + LLM review',
      },
    ],
    cautions: [
      "Procedural memory is the subject of Chapters 05/06 — one line here: skills are Hermes's " +
        '"muscle memory"',
      'Skill changes take effect next session by default — making them effective immediately breaks ' +
        'the prompt cache, at your own cost',
      'The curator archives but never deletes; archives live in ~/.hermes/skills/.archive/ and are recoverable',
    ],
  },
];

export const MEMORY_HOOK_EN =
  'Working handles the present, Episodic handles "what happened", Semantic handles "who you are", ' +
  'Procedural handles "how to do it". All four share one rule: writes must never break the cache ' +
  'of the ongoing conversation.';

// 本章专属 UI 文案（组件硬编码部分）。
export const MEMORY_UI = {
  stores: { zh: '存什么', en: 'What it stores' },
  writes: { zh: '何时写', en: 'When written' },
  reads: { zh: '何时读', en: 'When read' },
  impl: { zh: 'Hermes 对应实现', en: 'Where it lives in Hermes' },
  cautions: { zh: '注意事项', en: 'Cautions' },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住四层记忆', en: 'The four layers in one line' },
};
