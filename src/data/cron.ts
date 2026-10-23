// Chapter 12「Cron 定时调度」数据源：四种调度格式、tick 流程、加固不变量。
// 内容对齐 hermes-agent/cron/AGENTS.md 的 Cron 一节与 cron/jobs.py、cron/scheduler*.py。

export const CRON_INTRO =
  'Hermes 的 cron 不是系统 crontab 的包装，而是一个 agent 感知的调度器：' +
  'cron/jobs.py 管任务存储，cron/scheduler.py 管 tick 循环。agent 通过 cronjob_manage 工具给自己排任务，' +
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
    desc: '经典 crontab 格式（分 时 日 月 周；底层用 croniter 解析，也接受 6 字段与 MON/FRI 这类命名字段），最精确。用下面的解释器拆解常见写法。',
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
    body: '调度器先在该 profile 的 <home>/cron/.tick.lock（默认即 ~/.hermes/cron/.tick.lock）抢文件锁——多个 hermes 进程（CLI、网关）同时在线时，只有一个能执行这一拍，任务不会被触发两次。',
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
    body: '任务在自己的 cron session 中执行，MEMORY.md/USER.md 像普通会话一样加载（scheduler 固定 skip_memory=False，唯一的关闭开关是配置 agent.disabled_toolsets: [memory]）。per-job 字段可以覆盖 model/provider、加载指定 skills、先跑 script 把 stdout 注入 prompt、用 context_from 把其它任务的输出链进来、指定 workdir。',
    sourceRef: 'cron/jobs.py',
  },
  {
    id: 'interrupt',
    label: '兜底',
    title: '600 秒不活动看门狗',
    body: 'cron 会话由不活动看门狗看管：默认空闲 600 秒没有进展就硬中断（环境变量 HERMES_CRON_TIMEOUT 可改秒数，0 = 不限）。它掐的是空闲时长而不是墙钟——真正在干活的长任务不会被误杀；任务挂载的 script 另有限时（默认 3600 秒）。',
    sourceRef: 'cron/scheduler.py',
  },
  {
    id: 'deliver',
    label: '投递',
    title: '结果进独立会话，可选镜像回来源会话',
    body: 'cron 的执行与投递落在自己的 cron session 里，正文默认带 header/footer 包装（cron.wrap_response: false 可关）。符合条件的投递还能镜像回来源会话：默认关闭，由 per-job 的 attach_to_session 或全局 cron.mirror_delivery 打开；镜像以带 [Cron delivery: <任务名>] 标记的 user 轮追加在回合边界，主对话的消息角色交替与 prompt 缓存保持完整。',
    sourceRef: 'cron/scheduler_delivery.py',
  },
];

export const CRON_HARDENING: { title: string; desc: string }[] = [
  {
    title: '600 秒不活动看门狗',
    desc: '空闲超时才中断：runaway 循环无法独占调度器，活跃长任务不受误伤。',
  },
  { title: 'catchup 窗口', desc: '周期的一半，夹在 120s–2h：睡过的周期任务会补跑。' },
  { title: 'grace 窗口', desc: '一次性任务错过触发时间后 120 秒内仍补跑。' },
  {
    title: '.tick.lock 文件锁',
    desc: '跨进程防重复 tick（每个 profile 的 <home>/cron/ 下各一把）。',
  },
  {
    title: '记忆默认跟随普通会话',
    desc: 'cron 会话固定 skip_memory=False；要关掉记忆只能显式 agent.disabled_toolsets: [memory]。',
  },
  {
    title: '独立 cron session',
    desc: '执行在自己的会话里；可选镜像也只在回合边界追加，保持消息角色交替。',
  },
];

export const CRON_VERBS = ['list', 'add', 'edit', 'pause', 'resume', 'run', 'remove'];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const CRON_INTRO_EN =
  'Hermes cron is not a wrapper around the system crontab — it is an agent-aware scheduler: ' +
  'cron/jobs.py owns job storage, cron/scheduler.py owns the tick loop. The agent schedules jobs ' +
  'for itself via the cronjob_manage tool; users manage them with hermes cron <verb> or the /cron slash ' +
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
    desc: 'Classic crontab format (minute hour day month weekday; parsed by croniter, which also accepts a 6th seconds field and named months/weekdays) — the most precise. Break common forms down with the explainer below.',
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
    body: "The scheduler first grabs the file lock at the profile's <home>/cron/.tick.lock (default ~/.hermes/cron/.tick.lock) — when multiple hermes processes (CLI, gateway) are online, only one executes this tick, so jobs never fire twice.",
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
    body: "The job executes in its own cron session, loading MEMORY.md/USER.md like a normal session (the scheduler pins skip_memory=False; the only off-switch is setting agent.disabled_toolsets: [memory]). Per-job fields can override model/provider, load specific skills, run a script first and inject its stdout into the prompt, chain in other jobs' output via context_from, and set a workdir.",
    sourceRef: 'cron/jobs.py',
  },
  {
    id: 'interrupt',
    label: 'Backstop',
    title: '600-second inactivity watchdog',
    body: 'Cron sessions run under an inactivity watchdog: by default, 600 seconds without progress triggers a hard interrupt (override the seconds with the HERMES_CRON_TIMEOUT env var; 0 = unlimited). It measures idle time, not wall-clock — a long-but-active job is never cut off; an attached script is bounded separately (default 3600s).',
    sourceRef: 'cron/scheduler.py',
  },
  {
    id: 'deliver',
    label: 'Deliver',
    title: 'Results land in their own session, optionally mirrored back',
    body: "Cron execution and delivery live in their own cron session, with the response wrapped in a header/footer by default (cron.wrap_response: false disables). Eligible deliveries can also be mirrored back into the origin conversation: off by default, enabled per job via attach_to_session or globally via cron.mirror_delivery; the mirror is appended at a turn boundary as a user-role turn labelled [Cron delivery: <task name>], keeping the main conversation's message-role alternation and prompt caching intact.",
    sourceRef: 'cron/scheduler_delivery.py',
  },
];

export const CRON_HARDENING_EN: { title: string; desc: string }[] = [
  {
    title: '600-second inactivity watchdog',
    desc: 'Only idle time is interrupted: a runaway loop cannot monopolize the scheduler, while an active long job is never cut.',
  },
  {
    title: 'catchup window',
    desc: 'Half the period, clamped to 120s–2h: recurring jobs slept through get caught up.',
  },
  {
    title: 'grace window',
    desc: 'One-shot jobs still run within 120 seconds of a missed fire time.',
  },
  {
    title: '.tick.lock file lock',
    desc: 'Prevents duplicate ticks across processes (one lock per profile under <home>/cron/).',
  },
  {
    title: 'Memory follows the normal session by default',
    desc: 'Cron sessions pin skip_memory=False; the only way to turn memory off is agent.disabled_toolsets: [memory].',
  },
  {
    title: 'Separate cron session',
    desc: 'Execution lives in its own session; the optional mirror also appends only at a turn boundary, preserving role alternation.',
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
      `管理入口：agent 用 cronjob_manage 工具，用户用 hermes cron <${verbs}> 或 /cron 斜杠命令。`,
    en: (verbs: string) =>
      `Management entry points: the agent uses the cronjob_manage tool; users use hermes cron <${verbs}> or the /cron slash command.`,
  },
} as const;
