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
