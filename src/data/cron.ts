// Chapter 12「Cron 定时调度」数据源：四种调度格式、tick 流程、加固不变量。
// 内容对齐 hermes-agent/AGENTS.md「Cron (scheduled jobs)」（1051–1084 行）与 cron/jobs.py。

export const CRON_INTRO =
  'Hermes 的 cron 不是系统 crontab 的包装，而是一个 agent 感知的调度器：' +
  'cron/jobs.py 管任务存储，cron/scheduler.py 管 tick 循环。agent 通过 cronjob 工具给自己排任务，' +
  '用户用 hermes cron <verb> 或 /cron 斜杠命令管理。先用下面的实验室把四种调度格式玩熟。';

export interface ScheduleFormat {
  id: string;
  name: string;
  examples: string[];
  desc: string;
}

export const SCHEDULE_FORMATS: ScheduleFormat[] = [
  {
    id: 'duration',
    name: '时长',
    examples: ['30m', '2h', '1d'],
    desc: '最直白：从现在开始每隔一段时长跑一次。适合提醒、轮询类任务。',
  },
  {
    id: 'every',
    name: 'every 短语',
    examples: ['every 2h', 'every monday 9am'],
    desc: '自然语言描述周期，连「每周一上午 9 点」这种带星期的都行。',
  },
  {
    id: 'cron',
    name: '5 字段 cron 表达式',
    examples: ['0 9 * * *', '*/5 * * * *', '0 9 * * 1-5'],
    desc: '经典 crontab 格式（分 时 日 月 周），最精确。用下面的解释器拆解它。',
  },
  {
    id: 'iso',
    name: 'ISO 一次性时间戳',
    examples: ['2026-06-01T09:00:00Z'],
    desc: '只跑一次的任务：到点触发，错过有 120 秒宽限窗口。',
  },
];

export const CRON_PRESETS = ['0 9 * * *', '*/5 * * * *', '0 9 * * 1-5', '30 18 1 * *'];

export interface TickStep {
  id: string;
  label: string;
  title: string;
  body: string;
  sourceRef: string;
}

export const TICK_STEPS: TickStep[] = [
  {
    id: 'lock',
    label: '加锁',
    title: '文件锁防重复 tick',
    body: '调度器先在 ~/.hermes/cron/.tick.lock 抢文件锁——多个 hermes 进程（CLI、网关）同时在线时，只有一个能执行这一拍，任务不会被触发两次。',
    sourceRef: 'cron/scheduler.py',
  },
  {
    id: 'due',
    label: '到期',
    title: '找出到点任务',
    body: '扫描 job store，对照每类调度格式计算到期任务。错过的周期任务有 catchup 窗口（任务周期的一半，夹在 120 秒到 2 小时之间）；一次性任务有 120 秒 grace 窗口——机器睡眠醒来不会让任务悄悄丢。',
    sourceRef: 'cron/jobs.py',
  },
  {
    id: 'fire',
    label: '触发',
    title: '在独立会话里跑 agent',
    body: '任务在自己的 cron session 中执行，默认 skip_memory=True（记忆 provider 刻意不跑）。per-job 字段可以覆盖 model/provider、加载指定 skills、先跑 script 把 stdout 注入 prompt、用 context_from 把上一个任务的输出链进来、指定 workdir。',
    sourceRef: 'cron/jobs.py',
  },
  {
    id: 'interrupt',
    label: '兜底',
    title: '3 分钟硬中断',
    body: 'cron 会话有 3 分钟硬中断——agent 循环再失控也拖不死调度器，下一拍照常到来。这是加固不变量，不可关闭。',
    sourceRef: 'cron/scheduler.py',
  },
  {
    id: 'deliver',
    label: '投递',
    title: '结果进独立会话，不污染主会话',
    body: 'cron 的投递不会镜像进你的网关主会话——它们落在自己的 cron session 里并带 header/footer 框架，主对话的消息角色交替保持完整（这关系到 prompt 缓存与模型行为）。',
    sourceRef: 'cron/scheduler.py',
  },
];

export const CRON_HARDENING: { title: string; desc: string }[] = [
  { title: '3 分钟硬中断', desc: 'runaway agent 循环无法独占调度器。' },
  { title: 'catchup 窗口', desc: '周期的一半，夹在 120s–2h：睡过的周期任务会补跑。' },
  { title: 'grace 窗口', desc: '一次性任务错过触发时间后 120 秒内仍补跑。' },
  { title: '.tick.lock 文件锁', desc: '跨进程防重复 tick。' },
  { title: 'skip_memory=True', desc: 'cron 会话刻意不跑记忆 provider。' },
  { title: '独立 cron session', desc: '投递不进主会话，保持消息角色交替。' },
];

export const CRON_VERBS = ['list', 'add', 'edit', 'pause', 'resume', 'run', 'remove'];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const CRON_INTRO_EN =
  'Hermes cron is not a wrapper around the system crontab — it is an agent-aware scheduler: ' +
  'cron/jobs.py owns job storage, cron/scheduler.py owns the tick loop. The agent schedules jobs ' +
  'for itself via the cronjob tool; users manage them with hermes cron <verb> or the /cron slash ' +
  'command. Get fluent with the four schedule formats in the lab below.';

export const SCHEDULE_FORMATS_EN: ScheduleFormat[] = [
  {
    id: 'duration',
    name: 'Duration',
    examples: ['30m', '2h', '1d'],
    desc: 'The most direct: run once per interval from now. Good for reminders and polling.',
  },
  {
    id: 'every',
    name: 'every phrase',
    examples: ['every 2h', 'every monday 9am'],
    desc: 'Natural-language periods — even weekday-qualified ones like "every monday 9am".',
  },
  {
    id: 'cron',
    name: '5-field cron expression',
    examples: ['0 9 * * *', '*/5 * * * *', '0 9 * * 1-5'],
    desc: 'Classic crontab format (minute hour day month weekday) — the most precise. Break it down with the explainer below.',
  },
  {
    id: 'iso',
    name: 'ISO one-shot timestamp',
    examples: ['2026-06-01T09:00:00Z'],
    desc: 'Run-once jobs: fire at the time, with a 120-second grace window if missed.',
  },
];

export const TICK_STEPS_EN: TickStep[] = [
  {
    id: 'lock',
    label: 'Lock',
    title: 'File lock prevents duplicate ticks',
    body: 'The scheduler first grabs the file lock at ~/.hermes/cron/.tick.lock — when multiple hermes processes (CLI, gateway) are online, only one executes this tick, so jobs never fire twice.',
    sourceRef: 'cron/scheduler.py',
  },
  {
    id: 'due',
    label: 'Due',
    title: 'Find jobs that are due',
    body: "Scan the job store and compute due jobs per schedule format. Missed recurring jobs get a catchup window (half the job period, clamped between 120 seconds and 2 hours); one-shot jobs get a 120-second grace window — a machine waking from sleep won't silently drop jobs.",
    sourceRef: 'cron/jobs.py',
  },
  {
    id: 'fire',
    label: 'Fire',
    title: 'Run the agent in its own session',
    body: "The job executes in its own cron session with skip_memory=True by default (memory providers deliberately skipped). Per-job fields can override model/provider, load specific skills, run a script first and inject its stdout into the prompt, chain in the previous job's output via context_from, and set a workdir.",
    sourceRef: 'cron/jobs.py',
  },
  {
    id: 'interrupt',
    label: 'Backstop',
    title: '3-minute hard interrupt',
    body: 'Cron sessions have a 3-minute hard interrupt — even a runaway agent loop cannot stall the scheduler; the next tick arrives on schedule. This is a hardening invariant and cannot be disabled.',
    sourceRef: 'cron/scheduler.py',
  },
  {
    id: 'deliver',
    label: 'Deliver',
    title: 'Results land in their own session, not the main one',
    body: "Cron deliveries are not mirrored into your gateway main session — they land in their own cron session with a header/footer frame, keeping the main conversation's message-role alternation intact (which matters for prompt caching and model behavior).",
    sourceRef: 'cron/scheduler.py',
  },
];

export const CRON_HARDENING_EN: { title: string; desc: string }[] = [
  {
    title: '3-minute hard interrupt',
    desc: 'A runaway agent loop cannot monopolize the scheduler.',
  },
  {
    title: 'catchup window',
    desc: 'Half the period, clamped to 120s–2h: recurring jobs slept through get caught up.',
  },
  {
    title: 'grace window',
    desc: 'One-shot jobs still run within 120 seconds of a missed fire time.',
  },
  { title: '.tick.lock file lock', desc: 'Prevents duplicate ticks across processes.' },
  { title: 'skip_memory=True', desc: 'Cron sessions deliberately skip memory providers.' },
  {
    title: 'Separate cron session',
    desc: 'Deliveries stay out of the main session, preserving message-role alternation.',
  },
];

// CronLab 组件专属 UI 文案（通用文案见 ui-strings.ts）。
export const CRON_LAB_UI = {
  exprKicker: { zh: '表达式实验室', en: 'Expression Lab' },
  exprTitle: { zh: '把 cron 表达式拆开看', en: 'Take a cron expression apart' },
  exprPlaceholder: {
    zh: '分 时 日 月 周，如 0 9 * * *',
    en: 'min hour day month weekday, e.g. 0 9 * * *',
  },
  formatsKicker: { zh: '四种格式', en: 'Four Formats' },
  formatsTitle: { zh: 'Hermes 接受的调度写法', en: 'Schedule syntax Hermes accepts' },
  tickKicker: { zh: 'tick 流程', en: 'Tick Flow' },
  tickTitle: { zh: '调度器的一拍', en: 'One beat of the scheduler' },
  hardeningKicker: { zh: '加固不变量', en: 'Hardening Invariants' },
  hardeningTitle: { zh: '调度器不允许发生的事', en: 'What the scheduler must never allow' },
  footerNote: {
    zh: (verbs: string) =>
      `管理入口：agent 用 cronjob 工具，用户用 hermes cron <${verbs}> 或 /cron 斜杠命令。`,
    en: (verbs: string) =>
      `Management entry points: the agent uses the cronjob tool; users use hermes cron <${verbs}> or the /cron slash command.`,
  },
} as const;
