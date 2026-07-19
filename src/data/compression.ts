// Chapter 29「上下文压缩与 Checkpoint」数据源。
// 压缩部分对齐 agent/context_compressor.py 与 agent/conversation_compression.py 的 docstring；
// checkpoint 部分对齐 tools/checkpoint_manager.py 的模块 docstring（存储布局/触发/清理）。

export const COMPRESSION_INTRO =
  '第 04 章立过铁律：会话中途绝不改 past context——唯一的例外就是上下文压缩。' +
  '这一章拆开这个「唯一例外」：什么时候触发、怎么压、为什么它动上下文是安全的；' +
  '以及它的隐形搭档 checkpoint——agent 改你文件之前悄悄拍的快照。';

export interface CompressionStep {
  id: string;
  label: string;
  title: string;
  body: string;
  sourceRef: string;
}

export const COMPRESSION_STEPS: CompressionStep[] = [
  {
    id: 'probe',
    label: '可行性探测',
    title: '启动时先验证压缩模型够用',
    body: 'check_compression_model_feasibility 在启动时探测配置的辅助压缩模型：如果它的上下文窗口装不下主模型的压缩阈值，发出警告并在可能时自动调低会话阈值；低于 MINIMUM_CONTEXT_LENGTH 的辅助模型直接硬拒绝。压缩是兜底功能，不能在要用时才发现模型太小。',
    sourceRef: 'agent/conversation_compression.py',
  },
  {
    id: 'prune',
    label: '工具输出剪枝',
    title: '先做便宜的预清理',
    body: '在调用 LLM 之前先做一轮不花 token 的预清理：剪掉冗长的工具输出。很多上下文体积本来就是工具结果撑大的，便宜手段先回收一轮，昂贵的摘要留给真正需要理解的部分。',
    sourceRef: 'agent/context_compressor.py',
  },
  {
    id: 'summarize',
    label: '结构化摘要',
    title: '辅助模型压缩中段，保护头尾',
    body: '压缩器用便宜的辅助模型总结「中段」对话，头部（系统提示/初始指令）和尾部（最近的上下文）原样保护。摘要用结构化模板：追踪 Resolved / Pending 问题，历史段落用「仅供参考」的标题避免被读成当前指令；多次压缩之间迭代更新摘要而不是推倒重来，摘要预算随被压内容比例缩放。',
    sourceRef: 'agent/context_compressor.py',
  },
  {
    id: 'split',
    label: '会话分裂',
    title: 'SQLite 会话切分，session_id 轮换',
    body: 'compress_context 真正执行压缩：跑完压缩器后把 SQLite 里的会话切分、轮换 session_id，返回压缩后的消息列表和重新构建的系统提示。这也是为什么压缩是「允许的例外」——它是一次性的、刻意的缓存失效，换来继续对话的窗口空间。',
    sourceRef: 'agent/conversation_compression.py',
  },
  {
    id: 'notify',
    label: '通知外围',
    title: '上下文引擎与记忆 provider 同步',
    body: '压缩完成后通知插件上下文引擎（ContextEngine）和记忆 provider——它们各自维护对会话的视图，必须知道「消息流换过一轮」，否则记忆和检索会对不上号。',
    sourceRef: 'agent/conversation_compression.py',
  },
];

export const COMPRESSION_EXTRAS: { title: string; body: string }[] = [
  {
    title: '图片过大自救',
    body: 'try_shrink_image_parts_in_messages：当 provider 报「图片太大」（如 Anthropic 的 5 MB 上限），把消息里的 data:image/...;base64 部分重新编码成更小尺寸再重试——不动文字历史，只瘦身图片。',
  },
  {
    title: '为什么唯独它可以改上下文',
    body: 'prompt 缓存的失效单位是前缀。压缩把「前缀本身」换掉是有意为之的一次性失效：付一次全量重算的钱，换回后续每轮都便宜的短上下文。其他改动（换工具、改历史）只亏不赚。',
  },
];

export const CHECKPOINT_INTRO =
  'checkpoint 不是工具——LLM 根本看不见它。它是透明的基础设施：agent 每次要动你的文件之前，系统悄悄给工作目录拍一张快照，随时可回滚。';

export const CHECKPOINT_FACTS: { title: string; body: string }[] = [
  {
    title: '触发时机',
    body: '在文件变更操作之前自动快照：write_file、patch、带破坏性标志的 terminal。每个对话回合至多一次，不会在单回合里连拍。由 checkpoints 配置项或 --checkpoints CLI 标志控制。',
  },
  {
    title: '单一共享影子仓库',
    body: '所有项目共用一个 git 对象库（~/.hermes/checkpoints/store）：git 内容寻址天然去重，新增一个 worktree 的成本接近零。早期设计是每项目一个影子仓库，十几个 worktree 能烧掉 ~500 MB 重复对象。',
  },
  {
    title: '不污染你的项目',
    body: '用 GIT_DIR + GIT_WORK_TREE + GIT_INDEX_FILE 三件套操作，任何 git 状态都不会泄漏进你的项目目录——你的 .git 完全感知不到快照的存在。',
  },
  {
    title: '自动清理',
    body: 'prune_checkpoints 删掉工作目录已不存在（孤儿）或超过 retention_days（过期）的引用，跑 git gc 回收对象；另有容量上限 pass：总库超过 max_total_size_mb 时按项目从旧到新丢弃。',
  },
];

export const CHECKPOINT_LAYOUT = `~/.hermes/checkpoints/
    store/                    # 单一共享 git 对象库
        objects/              # 内容寻址，跨项目去重
        refs/hermes/<hash16>  # 每个项目一个分支头
        indexes/<hash16>      # 每个项目一个 index
        projects/<hash16>.json  # {workdir, created_at, last_touch}
    .last_prune               # 自动清理幂等标记`;
