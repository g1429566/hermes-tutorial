// Chapter 13「Kanban 工作队列」数据源：模拟任务卡、dispatcher 循环、隔离模型。
// 内容对齐 hermes-agent/AGENTS.md「Kanban (multi-agent work queue)」（1087–1126 行）。

export const KANBAN_INTRO =
  'kanban 是一块 SQLite 持久化的看板，让多个 profile / worker 在同一批任务上协作：' +
  '用户用 hermes kanban <verb> 驱动，dispatcher 催生的 worker 用专用 kanban_* toolset 驱动——' +
  '不在 kanban 任务里时，这些工具的 schema 占用为零。先在下面的模拟面板上亲手移几张卡。';

export type KanbanColumn = 'ready' | 'claimed' | 'blocked' | 'done';

export const KANBAN_COLUMNS: { id: KanbanColumn; name: string; desc: string }[] = [
  { id: 'ready', name: 'Ready', desc: '就绪，等待 dispatcher 认领' },
  { id: 'claimed', name: 'Claimed', desc: '已被 worker 原子认领，执行中' },
  { id: 'blocked', name: 'Blocked', desc: '被阻塞（或连续失败自动阻塞）' },
  { id: 'done', name: 'Done', desc: '完成' },
];

export interface KanbanCard {
  id: string;
  title: string;
  assignee: string;
  column: KanbanColumn;
}

export const INITIAL_CARDS: KanbanCard[] = [
  { id: 'T-101', title: '给网关加飞书 adapter 的骨架', assignee: 'coder', column: 'ready' },
  { id: 'T-102', title: '重写技能加载的缓存策略', assignee: 'coder', column: 'ready' },
  { id: 'T-103', title: '审计 plugins/ 的第三方依赖', assignee: 'reviewer', column: 'claimed' },
  { id: 'T-104', title: '修复 cron catchup 窗口计算', assignee: 'coder', column: 'claimed' },
  { id: 'T-105', title: '等待上游 API 开放配额', assignee: 'ops', column: 'blocked' },
  { id: 'T-106', title: '补齐 TUI 补全的测试', assignee: 'reviewer', column: 'done' },
];

// 卡片上可用的操作（模拟 worker 视角的 kanban_* 工具）
export const CARD_ACTIONS: {
  action: string;
  tool: string;
  from: KanbanColumn[];
  to: KanbanColumn;
}[] = [
  { action: '认领', tool: 'dispatcher 原子认领', from: ['ready'], to: 'claimed' },
  { action: '完成', tool: 'kanban_complete', from: ['claimed'], to: 'done' },
  { action: '阻塞', tool: 'kanban_block', from: ['claimed', 'ready'], to: 'blocked' },
  { action: '解阻', tool: 'kanban_unblock', from: ['blocked'], to: 'ready' },
];

export interface DispatcherStep {
  id: string;
  label: string;
  desc: string;
}

export const DISPATCHER_STEPS: DispatcherStep[] = [
  { id: 'reclaim', label: '回收', desc: '回收过期 claim（worker 心跳断了，任务不能让死）' },
  { id: 'promote', label: '提升', desc: '把满足条件的任务提升为 ready' },
  { id: 'claim', label: '认领', desc: '原子认领——两个 dispatcher 也不会拿到同一张卡' },
  { id: 'spawn', label: '催生', desc: '按 assignee spawn 对应 profile 的 worker' },
];

export const KANBAN_ISOLATION: { title: string; desc: string }[] = [
  {
    title: 'Board 是硬边界',
    desc: 'worker 被 spawn 时环境里钉死 HERMES_KANBAN_BOARD——它根本看不见别的板。',
  },
  {
    title: 'Tenant 是板内软命名空间',
    desc: '一个专家 fleet 可以服务多个业务：workspace 路径 + memory key 隔离。',
  },
  {
    title: 'failure_limit 自动阻塞',
    desc: '同一任务连续失败达到 kanban.failure_limit（默认 2）次，dispatcher 自动 block，防止 spin loop。',
  },
  {
    title: 'dispatcher 住进网关',
    desc: '默认 kanban.dispatch_in_gateway: true，长驻循环（默认 60s 一拍）跑在 gateway 进程里。',
  },
];

export const KANBAN_VERBS = [
  'init',
  'create',
  'list',
  'show',
  'assign',
  'complete',
  'block',
  'unblock',
  'archive',
  'comment',
  'attach',
  'dispatch',
  'daemon',
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const KANBAN_INTRO_EN =
  'kanban is a SQLite-persisted board that lets multiple profiles / workers collaborate on the ' +
  'same set of tasks: users drive it with hermes kanban <verb>, and dispatcher-spawned workers ' +
  'drive it with the dedicated kanban_* toolset — which costs zero schema space when you are not ' +
  'inside a kanban task. Move a few cards on the simulated board below first.';

export const KANBAN_COLUMNS_EN: { id: KanbanColumn; name: string; desc: string }[] = [
  { id: 'ready', name: 'Ready', desc: 'Ready, waiting for a dispatcher to claim' },
  { id: 'claimed', name: 'Claimed', desc: 'Atomically claimed by a worker, in progress' },
  { id: 'blocked', name: 'Blocked', desc: 'Blocked (or auto-blocked after repeated failures)' },
  { id: 'done', name: 'Done', desc: 'Done' },
];

export const INITIAL_CARDS_EN: KanbanCard[] = [
  {
    id: 'T-101',
    title: 'Scaffold a Feishu adapter for the gateway',
    assignee: 'coder',
    column: 'ready',
  },
  {
    id: 'T-102',
    title: 'Rework the skill-loading cache policy',
    assignee: 'coder',
    column: 'ready',
  },
  {
    id: 'T-103',
    title: 'Audit third-party dependencies in plugins/',
    assignee: 'reviewer',
    column: 'claimed',
  },
  {
    id: 'T-104',
    title: 'Fix the cron catchup window computation',
    assignee: 'coder',
    column: 'claimed',
  },
  { id: 'T-105', title: 'Waiting for upstream API quota', assignee: 'ops', column: 'blocked' },
  { id: 'T-106', title: 'Backfill tests for TUI completion', assignee: 'reviewer', column: 'done' },
];

export const CARD_ACTIONS_EN: {
  action: string;
  tool: string;
  from: KanbanColumn[];
  to: KanbanColumn;
}[] = [
  { action: 'Claim', tool: 'atomic claim by dispatcher', from: ['ready'], to: 'claimed' },
  { action: 'Complete', tool: 'kanban_complete', from: ['claimed'], to: 'done' },
  { action: 'Block', tool: 'kanban_block', from: ['claimed', 'ready'], to: 'blocked' },
  { action: 'Unblock', tool: 'kanban_unblock', from: ['blocked'], to: 'ready' },
];

export const DISPATCHER_STEPS_EN: DispatcherStep[] = [
  {
    id: 'reclaim',
    label: 'Reclaim',
    desc: 'Reclaim expired claims (a worker whose heartbeat died must not take the task with it)',
  },
  { id: 'promote', label: 'Promote', desc: 'Promote eligible tasks to ready' },
  { id: 'claim', label: 'Claim', desc: 'Atomic claim — two dispatchers never grab the same card' },
  { id: 'spawn', label: 'Spawn', desc: 'Spawn a worker of the matching profile per assignee' },
];

export const KANBAN_ISOLATION_EN: { title: string; desc: string }[] = [
  {
    title: 'The board is a hard boundary',
    desc: 'HERMES_KANBAN_BOARD is pinned into the environment when a worker is spawned — it simply cannot see other boards.',
  },
  {
    title: 'Tenant is a soft namespace inside a board',
    desc: 'One expert fleet can serve multiple businesses: isolated by workspace path + memory key.',
  },
  {
    title: 'failure_limit auto-block',
    desc: 'After kanban.failure_limit (default 2) consecutive failures on the same task, the dispatcher blocks it automatically, preventing spin loops.',
  },
  {
    title: 'The dispatcher lives in the gateway',
    desc: 'With the default kanban.dispatch_in_gateway: true, the long-running loop (one tick per 60s by default) runs inside the gateway process.',
  },
];

// KanbanLab 组件专属 UI 文案（通用文案见 ui-strings.ts）。
export const KANBAN_LAB_UI = {
  boardKicker: { zh: '面板模拟', en: 'Board Simulation' },
  boardTitle: { zh: '亲手移几张卡', en: 'Move a few cards yourself' },
  emptyColumn: { zh: '空', en: 'Empty' },
  boardHint: {
    zh: '你刚才的手动操作，对应 worker 真实调用的 kanban_* 工具（悬停按钮可见）。',
    en: 'Your manual moves map to the kanban_* tools a real worker calls (hover a button to see).',
  },
  dispatcherKicker: { zh: 'dispatcher', en: 'dispatcher' },
  dispatcherTitle: { zh: '60 秒一拍的催熟循环', en: 'The ripening loop, one tick per 60 seconds' },
  isolationKicker: { zh: '隔离模型', en: 'Isolation Model' },
  isolationTitle: {
    zh: '多 agent 不打架的四个机制',
    en: 'Four mechanisms that keep multi-agent work from colliding',
  },
  footerNote: {
    zh: (verbs: string) =>
      `入口：用户侧 hermes kanban <${verbs}>；worker 侧 kanban_* toolset（不在 kanban 任务里时 schema 占用为零）。`,
    en: (verbs: string) =>
      `Entry points: hermes kanban <${verbs}> for users; the kanban_* toolset for workers (zero schema cost outside kanban tasks).`,
  },
} as const;
