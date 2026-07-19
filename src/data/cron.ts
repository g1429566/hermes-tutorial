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
