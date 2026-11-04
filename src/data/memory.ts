// 第 07 章交互数据：当前上下文、内置记忆、历史、技能与可选外部记忆。
// 内容对齐 hermes-agent/AGENTS.md 的「Per-conversation prompt caching is sacred」
// 「Memory-provider plugins」「Skills」「Curator」各节，以及 hermes_state.py
// （SessionDB + FTS5）、agent/memory_provider.py（MemoryProvider ABC）、
// agent/memory_manager.py、agent/title_generator.py、tools/session_search_tool.py
// 的真实实现。

export interface MemoryLayer {
  id: 'working' | 'builtin' | 'episodic' | 'semantic' | 'procedural';
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
  '先区分当前上下文、内置文件记忆、历史与技能，再看可选的外部扩展。选中卡片，核对保存位置与读取时机。';

export const MEMORY_LAYERS: MemoryLayer[] = [
  {
    id: 'working',
    name: '当前上下文',
    latin: 'Context',
    tagline: '当前模型请求能看到的信息',
    lifecycle: '属于当前会话；恢复时可以从持久历史重建。一次用户回合可包含多次模型迭代。',
    stores: ['系统说明、对话消息与本次工具定义', '用户要求、模型工具调用和对应结果'],
    writes: '普通回合追加消息；容量压力下可由压缩路径整理历史。',
    reads: '随本次模型请求发送；稳定前缀在服务支持时可以复用缓存。',
    impl: [
      {
        path: 'agent/turn_context.py',
        note: '准备回合上下文',
      },
      {
        path: 'agent/conversation_loop.py',
        note: '控制迭代',
      },
    ],
    cautions: [
      '磁盘上存在文件，不代表本次模型已读到内容。',
      '缓存减少重复处理，不取消上下文窗口限制。',
    ],
  },
  {
    id: 'builtin',
    name: '内置持久记忆',
    latin: 'Built-in',
    tagline: 'MEMORY.md 与 USER.md',
    lifecycle: '文件跨会话保存，当前会话使用启动时读出的固定快照。',
    stores: [
      'USER.md：跨任务的用户事实与长期偏好',
      'MEMORY.md：环境事实与通用约定',
      '默认容量为 1,375 / 2,200 字符，可配置',
    ],
    writes: 'memory 工具实际成功时写入；staged 结果仍需审批，不能当作已保存。',
    reads: '新会话启动读取；当前会话的初始系统提示不因写入自动重建。',
    impl: [
      {
        path: 'tools/memory_tool.py',
        note: 'add / patch / remove 与写入门控',
      },
      {
        path: 'tools/memory_tool_store.py',
        note: '存储、容量和固定快照',
      },
    ],
    cautions: [
      'patch 只改 old_text 对应的唯一片段，其他内容保留。',
      '任务操作步骤放入技能，不占每个会话自动加载的容量。',
    ],
  },
  {
    id: 'episodic',
    name: '会话历史',
    latin: 'History',
    tagline: 'SQLite 与 session_search',
    lifecycle: '会话消息按运行时路径持久化，用于恢复和历史检索。',
    stores: ['既往用户消息、模型回复和工具记录', '会话标题、来源和时间等元数据'],
    writes: '运行中及回合收尾的持久化路径，不仅在整个会话结束后保存。',
    reads: 'session_search 按参数发现、读取、滚动或浏览已有消息。',
    impl: [
      {
        path: 'hermes_state.py',
        note: 'SessionDB 门面',
      },
      {
        path: 'tools/session_search_tool.py',
        note: '返回历史消息与元数据',
      },
    ],
    cautions: [
      '搜索本身不再调用模型生成摘要。',
      '历史里的地址、结论可能过时，必要时核对当前状态。',
    ],
  },
  {
    id: 'procedural',
    name: '技能与经验',
    latin: 'Skills',
    tagline: '按需读取的操作知识',
    lifecycle: '技能包跨会话保存；读取时进入当前上下文。',
    stores: [
      'SKILL.md：适用条件、步骤、判断与验收',
      'scripts/、references/、templates/ 等支持文件',
    ],
    writes: '前台明确学习或满足条件的后台复盘，通过 skill_manage 写入；也可能等待审批。',
    reads: '用户调用技能或 agent 按需读取；文件变更不会自动替换此前读过的上下文。',
    impl: [
      {
        path: 'tools/skills_tool.py',
        note: '发现与读取技能',
      },
      {
        path: 'tools/skill_manager_tool.py',
        note: '技能写入与校验',
      },
      {
        path: 'agent/background_review.py',
        note: '经验复盘',
      },
    ],
    cautions: [
      '新增技能数量不能证明任务质量提高。',
      '策展维护与逐回合复盘是不同机制；pin 也不等于编辑锁。',
    ],
  },
  {
    id: 'semantic',
    name: '外部记忆扩展',
    latin: 'External',
    tagline: '可选 MemoryProvider 插件',
    lifecycle: '由选定 provider 管理存储，可能依赖外部服务。',
    stores: ['按 provider 实现的相关事实、检索索引或用户模型'],
    writes: 'MemoryManager 通过回合同步和生命周期回调与插件配合。',
    reads: '准备用户回合时获取相关信息；插件可以异步预取。',
    impl: [
      {
        path: 'agent/memory_provider.py',
        note: '接口与生命周期',
      },
      {
        path: 'agent/memory_manager.py',
        note: '编排、同步和召回',
      },
    ],
    cautions: [
      '不安装外部 provider 也能用内置文件记忆。',
      '存储位置、网络、费用与能力随插件而异；不把 Honcho 当成默认必经阶段。',
    ],
  },
];

export const MEMORY_HOOK = '写到磁盘、进入当前上下文、改善下次任务，是三个需要分别核对的事件。';

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const MEMORY_INTRO_EN =
  'Distinguish live context, built-in files, history, and skills before optional external memory. Compare where information lives and when it is read.';

export const MEMORY_LAYERS_EN: MemoryLayer[] = [
  {
    id: 'working',
    name: 'Live context',
    latin: 'Context',
    tagline: 'What the current request can see',
    lifecycle:
      'Belongs to the conversation; persistent history can support recovery. One user turn can contain several model iterations.',
    stores: [
      'System instructions, messages, and tool definitions',
      'User requests, tool calls, and matched results',
    ],
    writes:
      'Normal turns append messages; compression can reshape history under capacity pressure.',
    reads: 'Included in the model request; stable prefixes may reuse provider caching.',
    impl: [
      {
        path: 'agent/turn_context.py',
        note: 'Prepare turn context',
      },
      {
        path: 'agent/conversation_loop.py',
        note: 'Control iterations',
      },
    ],
    cautions: [
      'A file on disk is not automatically present in model context.',
      'Caching does not remove context-window limits.',
    ],
  },
  {
    id: 'builtin',
    name: 'Built-in memory',
    latin: 'Built-in',
    tagline: 'MEMORY.md and USER.md',
    lifecycle: 'Files persist across sessions; each session starts with a fixed snapshot.',
    stores: [
      'USER.md: durable user facts and preferences',
      'MEMORY.md: environment facts and standing conventions',
      'Default limits: 1,375 / 2,200 characters, configurable',
    ],
    writes: 'A successful memory call persists a change. Staged writes still await approval.',
    reads:
      'Read at new-session startup; a write does not automatically rebuild the active snapshot.',
    impl: [
      {
        path: 'tools/memory_tool.py',
        note: 'add / patch / remove and write gates',
      },
      {
        path: 'tools/memory_tool_store.py',
        note: 'Persistence, capacity, and frozen snapshot',
      },
    ],
    cautions: [
      'patch replaces a unique old_text span and preserves the rest.',
      'Task procedures belong in skills, not always-loaded notes.',
    ],
  },
  {
    id: 'episodic',
    name: 'Conversation history',
    latin: 'History',
    tagline: 'SQLite and session_search',
    lifecycle: 'Runtime persistence retains messages for recovery and retrieval.',
    stores: ['Previous requests, answers, and tool records', 'Titles, source, and time metadata'],
    writes:
      'Persistence can occur during execution and turn finalization, not only at session end.',
    reads: 'session_search discovers, reads, scrolls, or browses stored messages.',
    impl: [
      {
        path: 'hermes_state.py',
        note: 'SessionDB facade',
      },
      {
        path: 'tools/session_search_tool.py',
        note: 'Historical messages and metadata',
      },
    ],
    cautions: [
      'Search itself does not generate an LLM summary.',
      'Old addresses and conclusions may need verification against current state.',
    ],
  },
  {
    id: 'procedural',
    name: 'Skills and lessons',
    latin: 'Skills',
    tagline: 'Procedural knowledge loaded on demand',
    lifecycle: 'A durable skill package enters context when read.',
    stores: [
      'SKILL.md: applicability, steps, decisions, acceptance',
      'Supporting scripts, references, and templates',
    ],
    writes:
      'Explicit learning or eligible background review writes through skill_manage, possibly pending approval.',
    reads:
      'Explicit invocation or relevant reading; a disk change does not replace earlier context.',
    impl: [
      {
        path: 'tools/skills_tool.py',
        note: 'Discover and read',
      },
      {
        path: 'tools/skill_manager_tool.py',
        note: 'Write and validate',
      },
      {
        path: 'agent/background_review.py',
        note: 'Review lessons',
      },
    ],
    cautions: [
      'More skills do not prove better results.',
      'Library maintenance differs from post-turn review; pin is not an edit lock.',
    ],
  },
  {
    id: 'semantic',
    name: 'External memory',
    latin: 'External',
    tagline: 'Optional MemoryProvider plugins',
    lifecycle: 'The provider owns its storage and may depend on an external service.',
    stores: ['Provider-specific facts, retrieval indexes, or user models'],
    writes: 'MemoryManager coordinates per-turn synchronization and lifecycle hooks.',
    reads: 'Recall is prepared for a user turn; implementations can prefetch asynchronously.',
    impl: [
      {
        path: 'agent/memory_provider.py',
        note: 'Provider interface',
      },
      {
        path: 'agent/memory_manager.py',
        note: 'Orchestration and recall',
      },
    ],
    cautions: [
      'Built-in files work without an external provider.',
      'Storage, cost, and capabilities vary; Honcho is not an obligatory default stage.',
    ],
  },
];

export const MEMORY_HOOK_EN =
  'Persisting information, loading it into context, and improving a later task are separate events to verify.';

// 本章专属 UI 文案（组件硬编码部分）。
export const MEMORY_UI = {
  stores: { zh: '存什么', en: 'What it stores' },
  writes: { zh: '何时写', en: 'When written' },
  reads: { zh: '何时读', en: 'When read' },
  impl: { zh: 'Hermes 对应实现', en: 'Where it lives in Hermes' },
  cautions: { zh: '注意事项', en: 'Cautions' },
  hookKicker: { zh: '要点回顾', en: 'Key idea' },
  hookTitle: { zh: '区分保存、读取与效果', en: 'Separate saving, reading, and effect' },
};
