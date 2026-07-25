// Chapter 27「可靠性设计」数据源：故障注入实验室。
// 事实来源：hermes-agent/AGENTS.md（Agent Loop / Cron / Kanban / Delegation /
// Prompt Caching / Wrong-Premise Patterns）与真实源码
// （run_agent.py、model_tools.py、cron/scheduler.py、tools/delegate_tool.py）。

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
    label: '补偿',
    desc: '故障已经发生，用降级、压缩、优雅收尾把损失换回来。',
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
  '真实的 agent 不是在「不出错」的环境里运行的：模型会限流、上下文会撑爆、用户会中途按 Esc、' +
  '一批工具调用会炸掉一个、无人值守的 cron 任务会陷入死循环、委派出去的子 agent 会石沉大海。' +
  '这一章把六种典型故障直接注入 Hermes 的主循环，看它的真实应对机制，' +
  '再把每种机制归到「重试 → 熔断 → 补偿 → 审计」四层防线上。点击任一故障卡开始。';

export const FAILURE_MODES: FailureMode[] = [
  {
    id: 'rate-limit',
    name: 'LLM API 429 / 限流',
    tagline: '供应商开始拒绝请求',
    symptom:
      'provider 返回 429（rate limit）：当前 API key 的额度被打满，' +
      '每一次 chat.completions.create 都可能抛错。长会话跑到一半被限流，' +
      '是最常见的「外部」故障——代码没有任何 bug，但路被堵了。',
    response:
      'Hermes 不把鸡蛋放在一个 key 里：credential_pool 维护一组凭证，撞上限流就换下一个；' +
      '换完凭证还不行，fallback_model 把请求降级到备选模型。AGENTS.md 还记录了一条熔断纪律：' +
      'rate-limit breaker 只在「确认空了」的账户桶上跳闸——冷却期内反复试探（re-probe）' +
      '只是空锤一个已证明为空的桶，这类「重试优化」PR 会被直接关掉。',
    mechanisms: [
      {
        name: 'credential_pool',
        desc: 'run_agent.py（AIAgent.__init__ 参数）：凭证池轮换，单 key 限流不等于会话死亡',
      },
      {
        name: 'fallback_model',
        desc: 'run_agent.py：主模型持续不可用时降级到备选模型，保住可用性',
      },
      {
        name: 'breaker 冷却纪律',
        desc: 'AGENTS.md §Wrong-Premise Patterns：只对 confirmed-empty 桶跳闸，禁止冷却期 re-probe',
      },
    ],
    layer: 'circuit',
    layerNote:
      '换凭证、降级模型、跳闸冷却，本质都是「发现这条路不通就先封路」，属于熔断层；' +
      '重试只发生在确认有新凭证可用之后。',
    source: 'run_agent.py · AGENTS.md §Wrong-Premise Patterns',
  },
  {
    id: 'context-overflow',
    name: '上下文窗口溢出',
    tagline: '对话长到模型吃不下',
    symptom:
      'messages 数组只增不减：长会话、大工具结果、委派汇总层层叠加，' +
      'token 总量逼近模型的上下文上限——再发一次同样的请求就会超限报错，重试毫无意义。',
    response:
      'Hermes 的第一设计约束是 per-conversation prompt caching：对话中途绝不改写历史、' +
      '不换工具集、不重建系统提示——唯一的例外就是上下文压缩。压缩把对话「折叠」成更短的形式后' +
      '继续循环（agent/context_compressor.py、agent/conversation_compression.py）。' +
      '大工具结果在写回消息流之前也会被截断或摘要，从源头减缓膨胀。',
    mechanisms: [
      {
        name: 'context compression',
        desc: 'agent/context_compressor.py：唯一被允许中途改变上下文的时刻（AGENTS.md §Prompt Caching Must Not Break）',
      },
      {
        name: '结果截断 / 摘要',
        desc: 'run_agent.py：大结果写回消息流前先瘦身，保护上下文窗口',
      },
      {
        name: '缓存纪律',
        desc: 'AGENTS.md：压缩之外的任何 mid-conversation 改写都会让缓存失效、成本翻倍',
      },
    ],
    layer: 'compensate',
    layerNote:
      '溢出无法靠重试解决——同样的请求再发一次还是超限。压缩是对已发生膨胀的补偿：' +
      '付出信息有损的代价，换对话继续。',
    source: 'agent/context_compressor.py · agent/conversation_compression.py',
  },
  {
    id: 'user-abort',
    name: '用户中途 abort',
    tagline: 'Esc 按下，循环必须体面地停',
    symptom:
      'agent 正在第 N 次迭代里调工具，用户按下 Esc 要求立刻停止。' +
      '粗暴地 kill 会留下写到一半的文件、未保存的会话和悬空的工具调用。',
    response:
      '中断在 Hermes 里不是异常，而是循环条件的一部分：run_conversation() 的 while 循环' +
      '每次迭代开头先检查 _interrupt_requested，发现标志就 break，而不是等异常炸出来。' +
      '正在运行的 agent 可通过 running_agent.interrupt() 收到中断；预算耗尽时还有' +
      ' one-turn grace call——给模型最后一轮机会把话讲完、把状态收好，再退出并把会话落盘。',
    mechanisms: [
      {
        name: '_interrupt_requested',
        desc: 'run_agent.py：每次迭代开头检查，中断是循环条件而非异常',
      },
      {
        name: 'running_agent.interrupt()',
        desc: 'AGENTS.md：外部命令向正在运行的 runner 发中断信号',
      },
      {
        name: 'one-turn grace call',
        desc: 'run_agent.py（_budget_grace_call）：收尾机会——总结、保存、体面退出',
      },
    ],
    layer: 'compensate',
    layerNote:
      'abort 不可避免也无需熔断——用户永远有权停止。要做的是补偿：' +
      '把中断变成一次有收尾、有落盘的正常退出。',
    source: 'run_agent.py',
  },
  {
    id: 'partial-tool-failure',
    name: '工具部分失败',
    tagline: '一批 tool_calls 里炸了一个',
    symptom:
      '模型一次响应返回多个 tool_calls，其中一个 handler 抛了异常。' +
      '如果异常穿透整个循环，前面成功的工具结果也一起丢失，agent 甚至不知道发生了什么。',
    response:
      'handle_function_call() 把每个工具调用裹在自己的 try/except 里：handler 抛出的异常被捕获、' +
      '清洗（_sanitize_tool_error），再序列化成 {"error": ...} 的 JSON 字符串，' +
      '作为这个 tool_call 的结果。循环照常以 role="tool" 的消息把错误追加回消息流——' +
      '模型下一轮亲眼看到错误，自己决定修正参数重试、换工具，还是向用户坦白。' +
      '错误被降级成信息，agent 的自我纠正能力就是防线本身。',
    mechanisms: [
      {
        name: '错误包装',
        desc: 'model_tools.py（handle_function_call 的 except 分支）：异常 → {"error": ...} JSON，循环不中断',
      },
      {
        name: '_sanitize_tool_error',
        desc: 'model_tools.py：工具异常可携带任意文本，进模型上下文前先清洗',
      },
      {
        name: '追加不改写',
        desc: 'run_agent.py：错误结果同样以 tool 消息 append，prompt cache 不受影响',
      },
    ],
    layer: 'compensate',
    layerNote:
      '单个工具炸了不代表任务失败。把异常翻译成 agent 可读的结果消息，' +
      '是让模型在下一轮自己完成「应用层重试」的补偿设计。',
    source: 'model_tools.py · run_agent.py',
  },
  {
    id: 'cron-runaway',
    name: 'cron 任务失控死循环',
    tagline: '无人值守的任务没人按 Esc',
    symptom:
      '凌晨三点，定时任务里的 agent 陷入死循环：反复调工具、迭代数疯涨。' +
      '没有用户在场按 Esc，它会一直烧 token，还把调度器死死占住，其他任务全部饿死。',
    response:
      'cron 会话带一组硬编码的加固不变量（hardening invariants）：3 分钟硬中断——' +
      '失控的 agent 循环不可能独占调度器；~/.hermes/cron/.tick.lock 文件锁防止多个进程重复 tick；' +
      '错过触发时间的任务按 catchup window（周期的一半，钳制在 120s–2h）与 120s grace window' +
      '（一次性任务）有界补跑，而不是疯狂追跑。cron 会话还默认 skip_memory=True，' +
      '记忆系统刻意不入场。看板侧另有一道闸：kanban.failure_limit（默认 2）次连续失败后，' +
      'dispatcher 自动 block 该任务，防止 spin loop。',
    mechanisms: [
      {
        name: '3 分钟硬中断',
        desc: 'cron/scheduler.py：AGENTS.md 明文的 hardening invariant，时间到就断电',
      },
      {
        name: '文件锁',
        desc: '~/.hermes/cron/.tick.lock：跨进程防重复 tick',
      },
      {
        name: 'catchup / grace window',
        desc: 'cron/scheduler.py：补跑有界——半个周期（钳制 120s–2h）/ 一次性任务 120s',
      },
      {
        name: 'failure_limit 自动 block',
        desc: 'kanban dispatcher：同一任务连续失败默认 2 次即锁死，防 spin loop',
      },
    ],
    layer: 'circuit',
    layerNote:
      '无人值守场景里熔断必须是机制而非约定：时间到就断电、失败到数就锁任务——' +
      '不指望循环自己醒过来。',
    source: 'cron/scheduler.py · cron/jobs.py',
  },
  {
    id: 'subagent-timeout',
    name: '子 agent 超时',
    tagline: '委派出去的任务石沉大海',
    symptom:
      '父 agent 用 delegate_task 派活给子 agent，子 agent 却卡在慢工具或自己的失控循环里。' +
      '父 agent 停在原地等汇总，整个委派树一起僵死。',
    response:
      '委派的隔离不只是上下文隔离，也是故障隔离：子 agent 跑在独立的 context + terminal session 里，' +
      '由 delegation.child_timeout_seconds 兜底超时；delegation.max_concurrent_children（默认 3）' +
      '与 max_spawn_depth（默认 2）把爆炸半径限制在委派树内。等不起的场景可以 background=true：' +
      '立即返回 delegation id，结果稍后通过 async-delegation completion queue 回到会话，' +
      '父 agent 继续自己的循环。需要扛进程重启的长活则该用 cronjob 或' +
      ' terminal(background=True)，而不是 background 委派。',
    mechanisms: [
      {
        name: 'child_timeout_seconds',
        desc: 'tools/delegate_tool.py（config: delegation.*）：子 agent 超时兜底',
      },
      {
        name: '隔离模型',
        desc: 'delegate_task：独立 context + terminal session，并发 ≤3、嵌套深度 ≤2',
      },
      {
        name: '异步完成队列',
        desc: 'background=true：结果经 completion queue 回流，父 agent 不死等',
      },
    ],
    layer: 'circuit',
    layerNote:
      '超时是「等了也没用，先掐断」的熔断；异步队列则把补偿前置——' +
      '从设计上直接消除「父等子」这个故障模式。',
    source: 'tools/delegate_tool.py',
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
    tradeoff: '高风险操作有人卡点就安全；代价是吞吐降到人的速度，审批疲劳会让人无脑放行。',
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
    label: 'Compensate',
    desc: 'The failure already happened; win the loss back with degradation, compression, and graceful wrap-up.',
  },
  {
    id: 'audit',
    label: 'Audit',
    desc: 'trajectories, SessionDB, and the observer keep full traces — they don’t prevent failures, but make every failure reviewable.',
  },
];

export const RELIABILITY_INTRO_EN =
  'Real agents don’t run in a world where nothing goes wrong: models get rate-limited, contexts overflow, ' +
  'users hit Esc mid-loop, one tool call in a batch blows up, unattended cron jobs spin into infinite loops, ' +
  'and delegated sub-agents vanish into the void. This chapter injects six typical failures straight into ' +
  'the Hermes agent loop to see its real countermechanisms, then maps each one onto the four-layer defense: ' +
  'retry → circuit break → compensate → audit. Click any failure card to start.';

export const FAILURE_MODES_EN: FailureMode[] = [
  {
    id: 'rate-limit',
    name: 'LLM API 429 / rate limit',
    tagline: 'The provider starts rejecting requests',
    symptom:
      'The provider returns 429 (rate limit): the current API key’s quota is exhausted, and every ' +
      'chat.completions.create may throw. Getting throttled halfway through a long session is the most ' +
      'common “external” failure — there’s no bug in the code, but the road is blocked.',
    response:
      'Hermes doesn’t put all its eggs in one key: credential_pool maintains a set of credentials and ' +
      'rotates to the next one when a limit is hit; if that still fails, fallback_model degrades the ' +
      'request to a backup model. AGENTS.md also records a circuit-breaking discipline: the rate-limit ' +
      'breaker only trips on account buckets confirmed empty — re-probing during the cooldown just ' +
      'hammers a bucket already proven empty, and PRs for this kind of “retry optimization” get closed ' +
      'on sight.',
    mechanisms: [
      {
        name: 'credential_pool',
        desc: 'run_agent.py (AIAgent.__init__ parameter): credential pool rotation — one throttled key doesn’t kill the session',
      },
      {
        name: 'fallback_model',
        desc: 'run_agent.py: degrade to a backup model when the primary stays unavailable, preserving availability',
      },
      {
        name: 'breaker cooldown discipline',
        desc: 'AGENTS.md §Wrong-Premise Patterns: trip only on confirmed-empty buckets; no re-probing during cooldown',
      },
    ],
    layer: 'circuit',
    layerNote:
      'Rotating credentials, degrading the model, tripping into cooldown — all are “close the road once ' +
      'it’s confirmed dead,” which is the circuit-break layer; retrying only happens after a fresh ' +
      'credential is confirmed available.',
    source: 'run_agent.py · AGENTS.md §Wrong-Premise Patterns',
  },
  {
    id: 'context-overflow',
    name: 'Context window overflow',
    tagline: 'The conversation grows past what the model can take',
    symptom:
      'The messages array only grows: long sessions, big tool results, and delegation summaries pile up, ' +
      'pushing total tokens toward the model’s context limit — sending the same request again just ' +
      'overruns the limit, so retrying is pointless.',
    response:
      'Hermes’s first design constraint is per-conversation prompt caching: never rewrite history, swap ' +
      'toolsets, or rebuild the system prompt mid-conversation — the sole exception is context ' +
      'compression. Compression folds the conversation into a shorter form and the loop continues ' +
      '(agent/context_compressor.py, agent/conversation_compression.py). Large tool results are also ' +
      'truncated or summarized before being written back into the message stream, slowing the bloat at ' +
      'the source.',
    mechanisms: [
      {
        name: 'context compression',
        desc: 'agent/context_compressor.py: the only moment allowed to change context mid-conversation (AGENTS.md §Prompt Caching Must Not Break)',
      },
      {
        name: 'result truncation / summarization',
        desc: 'run_agent.py: slim large results before writing them back, protecting the context window',
      },
      {
        name: 'caching discipline',
        desc: 'AGENTS.md: any mid-conversation rewrite other than compression busts the cache and doubles cost',
      },
    ],
    layer: 'compensate',
    layerNote:
      'Overflow can’t be retried away — the same request will overrun again. Compression compensates for ' +
      'bloat that already happened: it pays with lossy information to keep the conversation going.',
    source: 'agent/context_compressor.py · agent/conversation_compression.py',
  },
  {
    id: 'user-abort',
    name: 'User aborts mid-run',
    tagline: 'Esc is pressed; the loop must stop gracefully',
    symptom:
      'The agent is calling tools on iteration N when the user hits Esc demanding an immediate stop. ' +
      'A hard kill leaves half-written files, unsaved sessions, and dangling tool calls behind.',
    response:
      'In Hermes, interruption is not an exception but part of the loop condition: the while loop in ' +
      'run_conversation() checks _interrupt_requested at the top of every iteration and breaks when the ' +
      'flag is set, rather than waiting for an exception to blow up. A running agent can receive the ' +
      'interrupt via running_agent.interrupt(); when the budget runs out there’s also a one-turn grace ' +
      'call — a final turn for the model to finish speaking and pack up state, then exit and persist ' +
      'the session.',
    mechanisms: [
      {
        name: '_interrupt_requested',
        desc: 'run_agent.py: checked at the top of every iteration — interruption is a loop condition, not an exception',
      },
      {
        name: 'running_agent.interrupt()',
        desc: 'AGENTS.md: an external command sends the interrupt signal to the running runner',
      },
      {
        name: 'one-turn grace call',
        desc: 'run_agent.py (_budget_grace_call): a wrap-up chance — summarize, save, exit gracefully',
      },
    ],
    layer: 'compensate',
    layerNote:
      'Abort is inevitable and needs no breaker — the user always has the right to stop. What’s needed ' +
      'is compensation: turn the interrupt into a normal exit with wrap-up and persistence.',
    source: 'run_agent.py',
  },
  {
    id: 'partial-tool-failure',
    name: 'Partial tool failure',
    tagline: 'One tool_call in a batch blows up',
    symptom:
      'The model returns multiple tool_calls in one response, and one handler throws. If the exception ' +
      'tears through the whole loop, the earlier successful tool results are lost too, and the agent ' +
      'never learns what happened.',
    response:
      'handle_function_call() wraps each tool call in its own try/except: the handler’s exception is ' +
      'caught, sanitized (_sanitize_tool_error), and serialized into a {"error": ...} JSON string as ' +
      'that tool_call’s result. The loop appends the error back into the message stream as a normal ' +
      'role="tool" message — next turn the model sees the error with its own eyes and decides whether ' +
      'to fix the arguments and retry, switch tools, or confess to the user. The error is demoted to ' +
      'information; the agent’s self-correction is the defense itself.',
    mechanisms: [
      {
        name: 'error wrapping',
        desc: 'model_tools.py (the except branch of handle_function_call): exception → {"error": ...} JSON, loop keeps running',
      },
      {
        name: '_sanitize_tool_error',
        desc: 'model_tools.py: tool exceptions can carry arbitrary text — sanitized before entering model context',
      },
      {
        name: 'append, never rewrite',
        desc: 'run_agent.py: error results are appended as tool messages too, leaving the prompt cache intact',
      },
    ],
    layer: 'compensate',
    layerNote:
      'One failed tool doesn’t mean a failed task. Translating the exception into an agent-readable ' +
      'result message is a compensating design that lets the model perform the “application-layer retry” ' +
      'itself on the next turn.',
    source: 'model_tools.py · run_agent.py',
  },
  {
    id: 'cron-runaway',
    name: 'Cron job runs away',
    tagline: 'Nobody is around to press Esc',
    symptom:
      'At 3 a.m., the agent inside a scheduled job falls into an infinite loop: calling tools over and ' +
      'over, iteration count skyrocketing. With no user to press Esc, it burns tokens forever and holds ' +
      'the scheduler hostage while every other job starves.',
    response:
      'Cron sessions carry a set of hardcoded hardening invariants: a 3-minute hard interrupt — a ' +
      'runaway agent loop can never monopolize the scheduler; the ~/.hermes/cron/.tick.lock file lock ' +
      'prevents duplicate ticks across processes; jobs that miss their fire time get a bounded catch-up ' +
      'via a catchup window (half the period, clamped to 120s–2h) and a 120s grace window (one-shot ' +
      'jobs) instead of frantic replaying. Cron sessions also default to skip_memory=True — the memory ' +
      'system deliberately stays out. The kanban side adds another gate: after kanban.failure_limit ' +
      '(default 2) consecutive failures, the dispatcher automatically blocks the task to prevent spin ' +
      'loops.',
    mechanisms: [
      {
        name: '3-minute hard interrupt',
        desc: 'cron/scheduler.py: a hardening invariant spelled out in AGENTS.md — power is cut when time is up',
      },
      {
        name: 'file lock',
        desc: '~/.hermes/cron/.tick.lock: prevents duplicate ticks across processes',
      },
      {
        name: 'catchup / grace window',
        desc: 'cron/scheduler.py: bounded catch-up — half a period (clamped to 120s–2h) / 120s for one-shot jobs',
      },
      {
        name: 'failure_limit auto-block',
        desc: 'kanban dispatcher: 2 consecutive failures (default) lock the task, preventing spin loops',
      },
    ],
    layer: 'circuit',
    layerNote:
      'In unattended scenarios the breaker must be a mechanism, not a convention: cut power when time ' +
      'is up, lock the task when failures hit the limit — don’t count on the loop waking itself up.',
    source: 'cron/scheduler.py · cron/jobs.py',
  },
  {
    id: 'subagent-timeout',
    name: 'Sub-agent timeout',
    tagline: 'The delegated task vanishes into the void',
    symptom:
      'The parent agent dispatches work to a child via delegate_task, but the child gets stuck in a slow ' +
      'tool or its own runaway loop. The parent waits in place for the summary, and the whole delegation ' +
      'tree freezes.',
    response:
      'Delegation isolation is not just context isolation — it’s fault isolation: the child runs in its ' +
      'own context + terminal session, backstopped by delegation.child_timeout_seconds; ' +
      'delegation.max_concurrent_children (default 3) and max_spawn_depth (default 2) confine the blast ' +
      'radius to the delegation tree. When waiting isn’t an option there’s background=true: it returns ' +
      'a delegation id immediately, the result comes back later through the async-delegation completion ' +
      'queue, and the parent keeps running its own loop. Long jobs that must survive process restarts ' +
      'should use cronjob or terminal(background=True) instead of background delegation.',
    mechanisms: [
      {
        name: 'child_timeout_seconds',
        desc: 'tools/delegate_tool.py (config: delegation.*): timeout backstop for child agents',
      },
      {
        name: 'isolation model',
        desc: 'delegate_task: separate context + terminal session, concurrency ≤3, nesting depth ≤2',
      },
      {
        name: 'async completion queue',
        desc: 'background=true: results flow back via the completion queue — the parent never blocks',
      },
    ],
    layer: 'circuit',
    layerNote:
      'A timeout is a “waiting won’t help, cut it” circuit break; the async queue front-loads ' +
      'compensation — it eliminates the “parent waits on child” failure mode by design.',
    source: 'tools/delegate_tool.py',
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
      'A human gate makes high-risk operations safe; the cost is throughput capped at human speed, and approval fatigue leads to rubber-stamping.',
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
  symptom: { zh: '故障现象', en: 'Symptom' },
  response: { zh: 'Hermes 的真实应对', en: 'How Hermes actually responds' },
  mechanisms: { zh: '机制与源码', en: 'Mechanisms & source' },
  layerPrefix: { zh: '防线归属 · ', en: 'Defense layer · ' },
  sourcePrefix: { zh: '源码位置：', en: 'Source: ' },
  layersKicker: { zh: '四层防线', en: 'FOUR LAYERS' },
  layersTitle: {
    zh: '重试 → 熔断 → 补偿 → 审计',
    en: 'Retry → Circuit break → Compensate → Audit',
  },
  layersBody: {
    zh: '四层防线按「故障发生前 → 故障扩散前 → 故障发生后 → 全程留痕」排列。当前选中的故障主层已高亮——注意「重试」与「审计」没有专属故障卡：重试在 Hermes 里更多是模型看到错误结果后的自发行为，审计则默认贯穿每一次循环。',
    en: 'The four layers are ordered “before the failure → before it spreads → after it happens → traced throughout.” The selected failure’s primary layer is highlighted — note that “retry” and “audit” have no failure card of their own: in Hermes, retry is mostly the model’s spontaneous behavior after seeing an error result, and audit runs through every loop by default.',
  },
  handsOnKicker: { zh: '动手', en: 'HANDS-ON' },
  handsOnTitle: { zh: '设计你自己的防线', en: 'Design your own defenses' },
  countText: {
    zh: '已选 {n}/{total} 道防线 · 选择已保存到本地进度',
    en: '{n}/{total} defenses selected · saved to local progress',
  },
};
