// Chapter 16「Kanban 工作队列」数据源：模拟任务卡、dispatcher 循环、隔离模型。
// 内容对齐 hermes-agent/cron/AGENTS.md 的「Kanban (multi-agent work queue)」一节
// 与 website/docs/user-guide/features/kanban.md（手动摘录）。

export const KANBAN_INTRO =
  '看板把任务和依赖写入 SQLite 数据库。调度器认领就绪任务，并启动执行者（worker）。执行者处理分配给自己的任务，可以报告完成或遇到阻塞。协调者处理跨任务的调度决定，例如解除阻塞。下面的按钮分别模拟这些角色的动作。';

// The exercise follows ordinary execution cards without a review stage.
export type KanbanColumn = 'todo' | 'ready' | 'running' | 'blocked' | 'done';

export const KANBAN_COLUMNS: { id: KanbanColumn; name: string; desc: string }[] = [
  { id: 'todo', name: 'Todo', desc: '等待前置任务完成' },
  { id: 'ready', name: 'Ready', desc: '就绪，等待调度器认领' },
  { id: 'running', name: 'Running', desc: '调度器已认领，执行者正在处理' },
  { id: 'blocked', name: 'Blocked', desc: '被阻塞（或连续失败自动阻塞）' },
  { id: 'done', name: 'Done', desc: '完成' },
];

export interface KanbanCard {
  id: string;
  title: string;
  assignee: string;
  column: KanbanColumn;
  parentId?: string;
}

export const INITIAL_CARDS: KanbanCard[] = [
  { id: 'T-101', title: '给网关加飞书 adapter 的骨架', assignee: 'coder', column: 'ready' },
  { id: 'T-102', title: '重写技能加载的缓存策略', assignee: 'coder', column: 'ready' },
  { id: 'T-103', title: '审计 plugins/ 的第三方依赖', assignee: 'reviewer', column: 'running' },
  { id: 'T-104', title: '核对测试环境的接口权限', assignee: 'coder', column: 'running' },
  {
    id: 'T-105',
    title: '在配额恢复后运行接口测试',
    assignee: 'ops',
    column: 'blocked',
    parentId: 'T-104',
  },
  { id: 'T-106', title: '补齐 TUI 补全的测试', assignee: 'reviewer', column: 'done' },
];

// Completing a parent recomputes readiness for waiting cards in the real board as well.
export function moveKanbanCard(cards: KanbanCard[], id: string, to: KanbanColumn): KanbanCard[] {
  const parentFinished = (card: KanbanCard, board: KanbanCard[]) =>
    !card.parentId ||
    board.some((parent) => parent.id === card.parentId && parent.column === 'done');
  const moved = cards.map((card) => {
    if (card.id !== id) return card;
    const waiting = card.column === 'blocked' && to === 'ready' && !parentFinished(card, cards);
    return { ...card, column: waiting ? ('todo' as const) : to };
  });
  if (to !== 'done') return moved;
  return moved.map((card) =>
    card.column === 'todo' && parentFinished(card, moved) ? { ...card, column: 'ready' } : card,
  );
}

export const CARD_ACTIONS: {
  action: string;
  tool: string;
  from: KanbanColumn[];
  to: KanbanColumn;
}[] = [
  { action: '调度器认领', tool: 'dispatcher 原子认领', from: ['ready'], to: 'running' },
  { action: '执行者完成', tool: 'kanban_complete', from: ['running'], to: 'done' },
  { action: '执行者报告阻塞', tool: 'kanban_block', from: ['running'], to: 'blocked' },
  { action: '协调者解阻', tool: 'kanban_unblock', from: ['blocked'], to: 'ready' },
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
    title: '任务属于哪一块板',
    desc: '执行者启动时带有所属看板和任务标识，任务操作受归属检查约束。',
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
  'The board stores tasks and dependencies in SQLite. The dispatcher claims ready work and starts a worker. Each worker runs its assigned task and can report completion or a blocker. An orchestrator handles decisions across tasks, such as unblocking a card. The buttons below simulate actions by these different roles.';

export const KANBAN_COLUMNS_EN: { id: KanbanColumn; name: string; desc: string }[] = [
  { id: 'todo', name: 'Todo', desc: 'Waiting for a prerequisite' },
  { id: 'ready', name: 'Ready', desc: 'Ready for the dispatcher to claim' },
  { id: 'running', name: 'Running', desc: 'Claimed by the dispatcher and assigned to a worker' },
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
    column: 'running',
  },
  {
    id: 'T-104',
    title: 'Verify API permissions in the test environment',
    assignee: 'coder',
    column: 'running',
  },
  {
    id: 'T-105',
    title: 'Run integration tests once the API quota is restored',
    assignee: 'ops',
    column: 'blocked',
    parentId: 'T-104',
  },
  { id: 'T-106', title: 'Backfill tests for TUI completion', assignee: 'reviewer', column: 'done' },
];

export const CARD_ACTIONS_EN: {
  action: string;
  tool: string;
  from: KanbanColumn[];
  to: KanbanColumn;
}[] = [
  {
    action: 'Dispatcher claims',
    tool: 'atomic claim by dispatcher',
    from: ['ready'],
    to: 'running',
  },
  { action: 'Worker completes', tool: 'kanban_complete', from: ['running'], to: 'done' },
  { action: 'Worker reports blocker', tool: 'kanban_block', from: ['running'], to: 'blocked' },
  { action: 'Orchestrator unblocks', tool: 'kanban_unblock', from: ['blocked'], to: 'ready' },
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
    title: 'Assign work to a board',
    desc: 'Workers start with their assigned board and task identifiers. Task operations check ownership.',
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
  prerequisite: { zh: '前置任务', en: 'Prerequisite' },
  emptyColumn: { zh: '空', en: 'Empty' },
  boardHint: {
    zh: '假设 API 配额刚恢复。先解阻 T-105，观察它因为 T-104 尚未完成而回到 Todo。再完成 T-104，观察 T-105 进入 Ready。如果先完成 T-104，再解除外部阻塞，T-105 就会直接进入 Ready。',
    en: 'Assume the API quota has just been restored. Unblock T-105 first. Its prerequisite T-104 is still running, so T-105 goes to Todo. Complete T-104 and watch T-105 become Ready. If T-104 finishes before the unblock, T-105 goes straight to Ready when unblocked.',
  },
  dispatcherKicker: { zh: 'dispatcher', en: 'dispatcher' },
  dispatcherTitle: { zh: '调度器每轮怎样分配任务', en: 'How a dispatcher tick assigns work' },
  isolationKicker: { zh: '隔离模型', en: 'Isolation Model' },
  isolationTitle: {
    zh: '多 agent 不打架的四个机制',
    en: 'Four mechanisms that keep multi-agent work from colliding',
  },
  footerNote: {
    zh: (verbs: string) =>
      `可在终端运行 hermes kanban 命令，子命令包括 ${verbs}。执行者可使用自己的任务工具。配置了 kanban 工具集的协调者可调用 kanban_unblock。`,
    en: (verbs: string) =>
      `Use hermes kanban in the terminal. Available subcommands include ${verbs}. Workers get task tools. Orchestrators with the kanban toolset can call kanban_unblock.`,
  },
} as const;
