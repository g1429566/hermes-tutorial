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
