// Chapter 27「可靠性设计」数据源：故障注入实验室。
// 事实来源：hermes-agent/AGENTS.md（Agent Loop / Cron / Kanban / Delegation /
// Prompt Caching / verify-the-premise）与真实源码
// （run_agent.py、agent/conversation_loop.py、model_tools.py、cron/scheduler.py、tools/delegate_tool*.py）。

/* ── 四层防线 ─────────────────────────────────────────────────────── */
export type DefenseLayer = 'retry' | 'circuit' | 'compensate' | 'audit';

export const DEFENSE_LAYERS: { id: DefenseLayer; label: string; desc: string }[] = [
  {
    id: 'retry',
    label: '重试',
    desc: '失败后再试一次。最便宜的第一道防线，但只对「暂时性」故障有效。',
  },
  {
    id: 'circuit',
    label: '熔断',
    desc: '确认这条路不通就先封路：换凭证、掐超时、锁任务，防止故障扩散。',
  },
  {
    id: 'compensate',
    label: '恢复与降级',
    desc: '保留结果、压缩或降级以继续任务；不代表所有副作用已撤销。',
  },
  {
    id: 'audit',
    label: '审计',
    desc: 'trajectories、SessionDB、observer 全程留痕——不阻止故障，但让每次故障可被复盘。',
  },
];

/* ── 故障注入卡 ───────────────────────────────────────────────────── */
export interface FailureMode {
  id: string;
  name: string;
  tagline: string;
  symptom: string; // 故障现象
  response: string; // Hermes 的真实应对机制
  mechanisms: { name: string; desc: string }[]; // 机制清单（带源码依据）
  layer: DefenseLayer; // 四层防线归属（主层）
  layerNote: string; // 为什么属于这一层
  source: string; // 源码位置
}

export const RELIABILITY_INTRO =
  '选一个失败情境，先判断发生在哪一层，再选择修正、重试、停止或恢复。界面仅演示分析，不向真实系统注入故障。';

export const FAILURE_MODES: FailureMode[] = [
  {
    id: 'rate-limit',
    name: '限流与凭据问题',
    tagline: '限流与凭据问题',
    symptom: '服务拒绝或暂缓请求；429 可能对应不同限制，不能只凭状态码判断余额耗尽。',
    response: '先按实际错误分类与配置处理退避、凭据轮换或 fallback；没有可用替代路径时明确失败。',
    mechanisms: [
      {
        name: 'agent/turn_api_error.py',
        desc: '按当前实现路径和配置核对该类失败。',
      },
    ],
    layer: 'circuit',
    layerNote: '这里突出一个处理关注点；不同机制可以组合，不是所有故障都按四层依次执行。',
    source: 'agent/turn_api_error.py',
  },
  {
    id: 'context-overflow',
    name: '上下文超限',
    tagline: '上下文超限',
    symptom: '历史、工具结果或图片超过模型可容纳范围。',
    response: '不原样重复请求；先控制大输出，再按路径压缩，核对目标、规则与待办是否保留。',
    mechanisms: [
      {
        name: 'agent/conversation_compression.py',
        desc: '按当前实现路径和配置核对该类失败。',
      },
    ],
    layer: 'compensate',
    layerNote: '这里突出一个处理关注点；不同机制可以组合，不是所有故障都按四层依次执行。',
    source: 'agent/conversation_compression.py',
  },
  {
    id: 'user-abort',
    name: '用户中断',
    tagline: '用户中断',
    symptom: '用户要求停止正在执行的回合。',
    response: '协调请求、工具和后续迭代，记录已经发生的结果；外部副作用不一定能撤销。',
    mechanisms: [
      {
        name: 'agent/interrupt_control.py',
        desc: '按当前实现路径和配置核对该类失败。',
      },
    ],
    layer: 'compensate',
    layerNote: '这里突出一个处理关注点；不同机制可以组合，不是所有故障都按四层依次执行。',
    source: 'agent/interrupt_control.py',
  },
  {
    id: 'partial-tool-failure',
    name: '某个工具失败',
    tagline: '某个工具失败',
    symptom: '一批调用中某个返回错误，其他调用可能已经完成。',
    response: '为各调用保留正确结果或失败状态，模型据此修正；外发等动作重试前检查是否已发生。',
    mechanisms: [
      {
        name: 'model_tools.py',
        desc: '按当前实现路径和配置核对该类失败。',
      },
    ],
    layer: 'compensate',
    layerNote: '这里突出一个处理关注点；不同机制可以组合，不是所有故障都按四层依次执行。',
    source: 'model_tools.py',
  },
  {
    id: 'cron-runaway',
    name: '定时任务没有完成',
    tagline: '定时任务没有完成',
    symptom: '任务可能无活动地等待，也可能持续活动却没有完成目标。',
    response:
      '空闲超时只约束无进展；结合预算、迭代、运行限制与失败记录。文件锁不能代替副作用幂等。',
    mechanisms: [
      {
        name: 'cron/scheduler.py',
        desc: '按当前实现路径和配置核对该类失败。',
      },
    ],
    layer: 'circuit',
    layerNote: '这里突出一个处理关注点；不同机制可以组合，不是所有故障都按四层依次执行。',
    source: 'cron/scheduler.py',
  },
  {
    id: 'subagent-timeout',
    name: '子任务没有结果',
    tagline: '子任务没有结果',
    symptom: '子任务可能卡住、失败或仍在运行，派发标识不是完成结果。',
    response:
      '根据实际后端和运行状态处理停止、超时、重派与结果核对。内置线程上下文隔离不等于进程或文件系统隔离。',
    mechanisms: [
      {
        name: 'tools/delegate_tool_dispatch.py',
        desc: '按当前实现路径和配置核对该类失败。',
      },
    ],
    layer: 'circuit',
    layerNote: '这里突出一个处理关注点；不同机制可以组合，不是所有故障都按四层依次执行。',
    source: 'tools/delegate_tool_dispatch.py',
  },
];

/* ── 设计你自己的防线（checkbox 组，持久化） ───────────────────────── */
export interface DefenseOption {
  id: string;
  name: string;
  tradeoff: string; // 一句 tradeoff
}

export const DEFENSE_OPTIONS_INTRO =
  '没有免费的可靠性。勾选你会放进自己 agent 系统的防线——每一项都标出了它的代价，' +
  '选择会保存在本地进度里。';

export const DEFENSE_OPTIONS: DefenseOption[] = [
  {
    id: 'exponential-backoff',
    name: '指数退避重试',
    tradeoff: '用延迟换成功率；但对「确认已空」的限流桶重试只是空转，重试风暴还会放大故障。',
  },
  {
    id: 'circuit-breaker',
    name: '熔断器',
    tradeoff: '快速失败保护下游；代价是阈值难调——误熔断会把一次抖动变成完全不可用。',
  },
  {
    id: 'fallback-model',
    name: '降级模型',
    tradeoff: '保住可用性；代价是回答质量悄悄下降，而用户未必察觉。',
  },
  {
    id: 'human-approval',
    name: '人工审批',
    tradeoff: '帮助用户授权与审阅，但仍可能误判；还需正确作用域与实际结果核对。',
  },
  {
    id: 'audit-log',
    name: '审计日志',
    tradeoff: '事后可追溯、可复盘；代价是它拦不住任何故障，且留痕本身是存储与注意力成本。',
  },
  {
    id: 'dead-letter-queue',
    name: '死信队列',
    tradeoff: '处理不了的消息先收容不丢；代价是没有配套巡检时，队列会变成无人问津的故障坟墓。',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const DEFENSE_LAYERS_EN: typeof DEFENSE_LAYERS = [
  {
    id: 'retry',
    label: 'Retry',
    desc: 'Try again after a failure. The cheapest first line of defense, but only works on transient faults.',
  },
  {
    id: 'circuit',
    label: 'Circuit break',
    desc: 'Once a path is confirmed dead, close it: rotate credentials, cut timeouts, lock tasks — stop the failure from spreading.',
  },
  {
    id: 'compensate',
    label: 'Recovery',
    desc: 'Preserve results, compress, or degrade where appropriate; not every side effect can be reversed.',
  },
  {
    id: 'audit',
    label: 'Audit',
    desc: 'trajectories, SessionDB, and the observer keep full traces — they don’t prevent failures, but make every failure reviewable.',
  },
];

export const RELIABILITY_INTRO_EN =
  'Choose a scenario, identify its failed stage, then reason about correction, retry, stop, or recovery. No fault is injected into a real system.';

export const FAILURE_MODES_EN: FailureMode[] = [
  {
    id: 'rate-limit',
    name: 'Rate limits and credentials',
    tagline: 'Rate limits and credentials',
    symptom: 'A service rejects or delays requests. A 429 alone does not identify a zero balance.',
    response:
      'Classify the actual error, then use configured backoff, credential rotation, or fallback. Report failure if no viable route exists.',
    mechanisms: [
      {
        name: 'agent/turn_api_error.py',
        desc: 'Inspect the current route and configuration for this failure.',
      },
    ],
    layer: 'circuit',
    layerNote:
      'This category highlights one concern; mechanisms can be combined and do not form a mandatory execution order.',
    source: 'agent/turn_api_error.py',
  },
  {
    id: 'context-overflow',
    name: 'Context overflow',
    tagline: 'Context overflow',
    symptom: 'History, tool results, or media exceed model capacity.',
    response:
      'Do not resend unchanged input. Bound output, compress where appropriate, and verify continuation facts.',
    mechanisms: [
      {
        name: 'agent/conversation_compression.py',
        desc: 'Inspect the current route and configuration for this failure.',
      },
    ],
    layer: 'compensate',
    layerNote:
      'This category highlights one concern; mechanisms can be combined and do not form a mandatory execution order.',
    source: 'agent/conversation_compression.py',
  },
  {
    id: 'user-abort',
    name: 'User interruption',
    tagline: 'User interruption',
    symptom: 'The user requests that the active turn stop.',
    response:
      'Coordinate requests, tools, and later iterations; account for effects that already occurred.',
    mechanisms: [
      {
        name: 'agent/interrupt_control.py',
        desc: 'Inspect the current route and configuration for this failure.',
      },
    ],
    layer: 'compensate',
    layerNote:
      'This category highlights one concern; mechanisms can be combined and do not form a mandatory execution order.',
    source: 'agent/interrupt_control.py',
  },
  {
    id: 'partial-tool-failure',
    name: 'A tool fails',
    tagline: 'A tool fails',
    symptom: 'One call fails while others may already have completed.',
    response:
      'Preserve each outcome, correct the cause, and check uncertain external effects before retrying.',
    mechanisms: [
      {
        name: 'model_tools.py',
        desc: 'Inspect the current route and configuration for this failure.',
      },
    ],
    layer: 'compensate',
    layerNote:
      'This category highlights one concern; mechanisms can be combined and do not form a mandatory execution order.',
    source: 'model_tools.py',
  },
  {
    id: 'cron-runaway',
    name: 'A scheduled task stalls',
    tagline: 'A scheduled task stalls',
    symptom: 'A job can wait without activity or stay active without finishing.',
    response:
      'Inactivity limits cover missing progress. Combine budgets, iteration or runtime bounds, and failure accounting; locks do not make side effects idempotent.',
    mechanisms: [
      {
        name: 'cron/scheduler.py',
        desc: 'Inspect the current route and configuration for this failure.',
      },
    ],
    layer: 'circuit',
    layerNote:
      'This category highlights one concern; mechanisms can be combined and do not form a mandatory execution order.',
    source: 'cron/scheduler.py',
  },
  {
    id: 'subagent-timeout',
    name: 'A child produces no result',
    tagline: 'A child produces no result',
    symptom:
      'A child may be stuck, failed, or still running; a dispatch identifier is not completion.',
    response:
      'Use backend state to handle stops, timeouts, retries, and results. Built-in context isolation is not process or filesystem isolation.',
    mechanisms: [
      {
        name: 'tools/delegate_tool_dispatch.py',
        desc: 'Inspect the current route and configuration for this failure.',
      },
    ],
    layer: 'circuit',
    layerNote:
      'This category highlights one concern; mechanisms can be combined and do not form a mandatory execution order.',
    source: 'tools/delegate_tool_dispatch.py',
  },
];

export const DEFENSE_OPTIONS_INTRO_EN =
  'There’s no free reliability. Check the defenses you’d put in your own agent system — each one is ' +
  'labeled with its cost, and your choices are saved to local progress.';

export const DEFENSE_OPTIONS_EN: DefenseOption[] = [
  {
    id: 'exponential-backoff',
    name: 'Exponential backoff retry',
    tradeoff:
      'Trades latency for success rate; but retrying a confirmed-empty rate-limit bucket just spins, and a retry storm amplifies the failure.',
  },
  {
    id: 'circuit-breaker',
    name: 'Circuit breaker',
    tradeoff:
      'Fails fast to protect downstream; the cost is tricky thresholds — a false trip turns a blip into total unavailability.',
  },
  {
    id: 'fallback-model',
    name: 'Fallback model',
    tradeoff:
      'Preserves availability; the cost is quietly degraded answer quality that users may not notice.',
  },
  {
    id: 'human-approval',
    name: 'Human approval',
    tradeoff:
      'Supports authorization and review, with possible mistakes; scope and actual outcomes still need checking.',
  },
  {
    id: 'audit-log',
    name: 'Audit log',
    tradeoff:
      'Traceable and reviewable after the fact; the cost is that it blocks no failure, and tracing itself costs storage and attention.',
  },
  {
    id: 'dead-letter-queue',
    name: 'Dead-letter queue',
    tradeoff:
      'Unprocessable messages are held instead of lost; the cost is that without paired inspection, the queue becomes a graveyard of failures nobody visits.',
  },
];

// ReliabilityLab 专属 UI 文案（中英对）。
export const RELIABILITY_UI = {
  symptom: {
    zh: '故障现象',
    en: 'Symptom',
  },
  response: {
    zh: '处理路径与条件',
    en: 'Handling paths and conditions',
  },
  mechanisms: {
    zh: '机制与源码',
    en: 'Mechanisms & source',
  },
  layerPrefix: {
    zh: '防线归属 · ',
    en: 'Defense layer · ',
  },
  sourcePrefix: {
    zh: '源码位置：',
    en: 'Source: ',
  },
  layersKicker: {
    zh: '处理关注点',
    en: 'HANDLING CONCERNS',
  },
  layersTitle: {
    zh: '重试、熔断、恢复与审计',
    en: 'Retry, circuit breaking, recovery, and audit',
  },
  layersBody: {
    zh: '这些是不同处理关注点，可以组合，不是所有故障必经的固定四步。',
    en: 'These concerns can be combined; they are not four mandatory steps for every failure.',
  },
  handsOnKicker: {
    zh: '动手',
    en: 'HANDS-ON',
  },
  handsOnTitle: {
    zh: '设计你自己的防线',
    en: 'Design your own defenses',
  },
  countText: {
    zh: '已选 {n}/{total} 道防线 · 选择已保存到本地进度',
    en: '{n}/{total} defenses selected · saved to local progress',
  },
};
