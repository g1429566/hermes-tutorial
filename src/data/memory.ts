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
