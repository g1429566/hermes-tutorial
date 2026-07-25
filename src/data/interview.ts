// Chapter 23「Agent 循环设计题」与 Chapter 26「自我评估与面试清单」共用数据源。
// 所有模范思路以 hermes-agent/AGENTS.md 的真实设计为依据：
// §AIAgent Class / Agent Loop（314–371）、§Adding New Tools（509–556）、
// §Toolsets（964–981）、§Prompt Caching Must Not Break（1132–1144）。

export interface LoopQuestion {
  id: string;
  question: string;
  hint: string; // 思考提示：翻转前的引导，不给答案
  answer: string; // 模范思路
  followUps: string[]; // 追问链（2–3 条）
  rubric: string[]; // 评分维度（3 条）
}

export interface SelfAssessmentTopic {
  id: string;
  topic: string;
  sourceRef: string; // 对应的 hermes-agent 源码路径或 AGENTS.md 章节
}

export const INTERVIEW_INTRO =
  '面试官考察 agent 循环，不是要你背概念，而是看你能不能用真实系统的取舍讲道理。' +
  '下面每张卡都是一道真实的循环设计题：先看问题和思考提示，在心里（或默念区里）组织自己的回答，' +
  '再翻转对照以 Hermes 真实设计为参照的模范思路。答不上来不可怕——把追问链也过完，' +
  '确认能讲清楚之后，标记「能答上来了」。';

export const LOOP_QUESTIONS: LoopQuestion[] = [
  {
    id: 'sync-while',
    question: '为什么 Hermes 的 agent 主循环是一个同步 while 循环，而不是事件驱动或 async 架构？',
    hint: '想想单次会话内的依赖关系、调试成本，以及流式输出被放在了哪一层。',
    answer:
      '主循环就在 run_conversation() 里，AGENTS.md 明确说它「entirely synchronous, with interrupt checks, ' +
      'budget tracking, and a one-turn grace call」。同步 while 让控制流完全显式：每轮迭代就是' +
      '「检查中断 → 调模型 → 有 tool_calls 就执行并 append → 计数」，预算和中断都是循环条件的一部分。' +
      '单次会话内每一步都强依赖上一步的结果，事件驱动换来的并发收益几乎为零，却要把这条顺序链拆成回调状态机。' +
      '感知层的复杂度被推到了显示层（CLI 的 spinner、TUI 的 message.delta 事件），不污染循环本体。' +
      '真正的并发发生在循环之外：delegate_task 的 batch tasks、gateway 的多平台接入。',
    followUps: [
      '那并发需求怎么解决？——并发在 delegate_task 的 tasks 数组层做（受 delegation.max_concurrent_children 默认 3 限制），主循环保持串行。',
      '人类介入（approval）卡在哪？——在工具执行前的钩子里同步等待，循环本身就是阻塞的，不需要额外状态机。',
      '后台 delegate 完成的结果怎么回到会话？——通过 async-delegation completion queue，在后续轮次注入，而不是打断当前循环。',
    ],
    rubric: [
      '说清「同步 ≠ 没有异步边界」，能指出异步发生在哪些层',
      '知道流式输出在显示层处理，不进主循环',
      '能分析事件驱动在这个场景的真实代价（状态机复杂度 vs 零并发收益）',
    ],
  },
  {
    id: 'append-only',
    question: '为什么 Hermes 的消息流只 append、绝不改写历史消息？',
    hint: '这和钱直接相关——想想 prompt cache 的失效条件是什么。',
    answer:
      'Hermes 的第一设计约束是 per-conversation prompt caching（AGENTS.md「Prompt Caching Must Not Break」）：' +
      '长对话每一轮都复用已缓存的前缀。任何对 past context 的 in-place 修改——改历史消息、中途换 toolset、' +
      '重建 system prompt——都会让缓存整体失效，之后每轮全量重算，成本大幅上升。' +
      '所以消息流只增长：工具结果以 role="tool" 消息 append，连技能斜杠命令都以 user 消息注入而不是改写 system prompt。' +
      '唯一的例外是上下文压缩（context compression）：那是故意的、一次性的失效，用来换回上下文窗口空间。' +
      '其他一切变更默认 deferred invalidation（下次会话生效），--now 才立即失效。',
    followUps: [
      '用户中途 /skills install 怎么办？——默认写入配置、下次会话生效；加 --now 立即生效并接受缓存失效的代价。',
      '压缩时不也改写了历史吗？——对，那是唯一被允许的例外：窗口耗尽的代价大于一次性缓存失效，压缩后的新前缀从下一轮起重新被缓存。',
      '如果 provider 不支持缓存呢？——策略不变；append-only 对正确性和可审计性同样有好处。',
    ],
    rubric: [
      '把 append-only 与缓存命中率的因果关系讲清楚',
      '知道唯一例外是 context compression 及其理由',
      '知道 --now / deferred invalidation 模式',
    ],
  },
  {
    id: 'budget',
    question: 'max_iterations=90 和 iteration budget 是怎么设计的？为什么不是简单的 for 循环计数？',
    hint: '注意循环条件有三个部分，以及 grace call 存在的意义。',
    answer:
      '循环条件是 `(api_call_count < max_iterations and iteration_budget.remaining > 0) or _budget_grace_call`。' +
      'max_iterations 默认 90，是与子 agent 共享的全局上限——subagent 继承同一量级，配合 delegation.max_spawn_depth=2 ' +
      '把整棵委派树的总工作量锁住。iteration_budget 是更细的预算维度，预算先耗尽也会停。' +
      'one-turn grace call 是关键细节：预算耗尽后仍给模型最后一轮，让它把手头信息收尾成最终回答，' +
      '而不是硬切断留一个烂尾会话。循环的三个出口：模型返回纯文本（正常完成）、触碰上限（强制收尾）、用户中断。',
    followUps: [
      '子 agent 为什么共享同一上限？——防递归失控；delegation.max_iterations 可单独覆盖，但默认继承主 agent 的量级。',
      '预算耗尽时用户看到什么？——grace call 产出的收尾回答，而不是一个截断的工具结果。',
      '为什么不能没有上限？——agent 会陷入工具调用死循环；上限是成本控制，也是故障隔离。',
    ],
    rubric: [
      '能复述循环条件的三个部分（迭代数 / 预算 / grace call）',
      '理解 grace call 的动机：体面收尾而非硬切断',
      '知道上限与子 agent 共享，配合 spawn depth 锁总量',
    ],
  },
  {
    id: 'interrupt',
    question: '用户在 CLI 里按 Esc 中断 agent，循环里是怎么处理的？为什么不用异常？',
    hint: '中断标志在循环的哪个位置被检查？工具执行到一半会怎样？',
    answer:
      '每次迭代开头检查 `self._interrupt_requested`，为真则 break——AGENTS.md 的循环伪代码第一行就是它。' +
      '中断被设计成循环条件的一部分：Esc 只是设置标志位，agent 在下一个迭代边界这个「安全点」退出，' +
      '而不是在工具执行中途被异常撕开。这保证消息流始终一致（没有半截的 tool_call 悬在空中），' +
      '会话可以体面收尾、正常落盘。同一套机制也服务系统级中断：cron 会话有 3 分钟硬中断，' +
      '失控的 agent 循环不能把调度器拖死。',
    followUps: [
      '为什么不在工具执行中间硬断？——会留下不成对的消息（有 tool_call 无 tool 结果），破坏消息流一致性，也破坏缓存前缀。',
      '中断后还能继续这个会话吗？——消息流完整落盘（SessionDB），可以恢复。',
      '系统级中断的例子？——cron 3 分钟硬中断，同一套标志机制，只是触发源从用户变成看门狗。',
    ],
    rubric: [
      '标志位 + 迭代边界检查点，而非异常打断',
      '能对比异常方案的状态一致性问题（半截 tool_call）',
      '能举 cron 3 分钟硬中断作为系统级中断的例子',
    ],
  },
  {
    id: 'json-results',
    question: '为什么所有工具 handler 必须返回 JSON 字符串，而不是 Python 对象或自然语言段落？',
    hint: '想想 registry 在不知道工具内部类型的情况下要做什么。',
    answer:
      'AGENTS.md 写明「All handlers MUST return a JSON string」。registry 统一负责 schema 收集、分发、' +
      '可用性检查和错误包装，它不该感知每个工具的内部类型——统一的字符串边界让它可以通用地做截断/摘要来保护上下文窗口。' +
      '结果经 tool_result_message 包成 OpenAI role="tool" 消息 append。结构化 JSON（success/data/error 字段）' +
      '让模型能稳定解析成败：错误也被包装成正常的结果消息而不是抛出，agent 能看到失败并自我纠正，' +
      '循环不会因为一个工具的异常而崩掉。',
    followUps: [
      '如果工具内部抛异常呢？——registry 包装成错误 JSON 返回，agent 在下一轮看到并自我纠正。',
      '大结果怎么处理？——统一截断/摘要，保护上下文窗口；边界是字符串才好做通用处理。',
      '为什么不让模型直接读 Python 对象的 repr？——schema 不稳定的输出会让模型解析出错，JSON 字段是可依赖的契约。',
    ],
    rubric: [
      '统一边界：registry 不感知工具内部类型',
      '错误即结果消息：agent 可自我纠正，循环不崩',
      '对上下文保护（截断/摘要）友好',
    ],
  },
  {
    id: 'register-vs-expose',
    question: '加一个新工具为什么写了 tools/your_tool.py 还不够，必须再登记 toolsets.py？',
    hint: '区分「注册进 registry」和「暴露给 agent」这两件事。',
    answer:
      '自动发现只负责注册：任何 tools/*.py 顶层调用 registry.register() 的模块 import 即注册 schema，没有手动 import 列表。' +
      '但暴露给 agent 是另一个 deliberate 步骤——工具名必须出现在 toolsets.py 的 TOOLSETS dict 里。' +
      '分开的好处：schema footprint 可控，比如 kanban worker 不在 kanban 任务内时工具足迹为零；' +
      '按平台裁剪，Telegram 用 messaging toolset，各平台默认继承 _HERMES_CORE_TOOLS；' +
      'check_fn / requires_env 环境不满足时自动隐藏工具。面试里点出「registration ≠ exposure」这两层设计，' +
      '说明你想过工具的可见性是有成本的——每个 schema 都占上下文、都稀释模型的注意力。',
    followUps: [
      '为什么要控制 schema footprint？——每个工具 schema 都随 messages 发出，占 token、稀释注意力，还会增加误调用。',
      '本地自定义工具也必须改核心吗？——不，走插件路线：~/.hermes/plugins/<name>/ 里 ctx.register_tool(...)，不动 tools/ 和 toolsets.py。',
      'check_fn 干什么？——环境检查（如 API key 是否存在），不满足就不暴露该工具。',
    ],
    rubric: [
      '说清注册与暴露是两层，各自动作是什么',
      '知道 _HERMES_CORE_TOOLS 的角色（各平台默认继承的 bundle）',
      '理解 schema footprint 的成本与按平台/场景裁剪',
    ],
  },
  {
    id: 'compression-exception',
    question: '上下文压缩（context compression）为什么是「缓存铁律」的唯一例外？',
    hint: '压缩同样改写了历史——为什么不违反自己定下的规矩？',
    answer:
      '铁律禁止会话中途 alter past context / change toolsets / rebuild system prompt，因为任何改写都让 prompt cache 失效。' +
      '压缩同样改写历史，但它是故意的、一次性的失效：当消息流逼近上下文窗口上限时，不压缩会话就直接死亡——' +
      '一次性缓存失效的代价远小于会话无法继续。压缩形成的新前缀从下一轮起重新被缓存，成本回落。' +
      '关键在于「唯一」二字：其他一切变更（装技能、改工具集、重载记忆）都走 deferred invalidation，' +
      '默认下次会话生效，--now 才立即失效。把例外收敛到一个，规则才真正可执行。',
    followUps: [
      '压缩的时机谁决定？——上下文窗口压力驱动，是循环里唯一被允许的上下文变更点。',
      '压缩丢信息怎么办？——这是压缩本身的质量问题；工程上保证它只发生一次、之后缓存重建，是成本层面的兜底。',
      '为什么不能允许「再允许几个例外」？——例外一旦泛化，缓存命中率就不可预测，成本模型失效。',
    ],
    rubric: [
      '承认压缩也是破缓存，不是狡辩',
      '说清权衡：一次性失效 vs 会话死亡',
      '知道压缩后新前缀重新进入缓存，且其他变更走 deferred invalidation',
    ],
  },
  {
    id: 'skill-injection',
    question: '技能斜杠命令为什么注入为 user 消息，而不是更新 system prompt？',
    hint: '缓存前缀里哪个位置最「碰不得」？',
    answer:
      'agent/skill_commands.py 扫描 ~/.hermes/skills/ 后，把技能内容以 user 消息注入——AGENTS.md 的原话是 ' +
      '「injects as user message (not system prompt) to preserve prompt caching」。' +
      'system prompt 位于缓存前缀的最头部，改它等于让整段前缀失效；user 消息 append 在消息流尾部，前缀不动。' +
      '代价是技能指令的权威性低于 system prompt——用消息角色换缓存命中率，是 Hermes 缓存优先设计的典型取舍。' +
      '这个模式在全仓库一致：任何会改变 system prompt 状态的操作都默认 deferred，下次会话再生效。',
    followUps: [
      '注入 user 消息有什么副作用？——权威性弱于 system prompt，模型可能不听；这是刻意的取舍。',
      '为什么缓存前缀头部最敏感？——前缀缓存按前缀匹配，头部一变，后面全部失效。',
      '同样的取舍还出现在哪？——/tools、memory 相关命令都默认 deferred invalidation，--now 才立即生效。',
    ],
    rubric: [
      '知道前缀缓存的位置敏感性：头部改动 = 全部失效',
      '说清 append user 消息 vs 改写 system prompt 的取舍',
      '能指出这是全仓库一致的模式（deferred invalidation）',
    ],
  },
  {
    id: 'parallel-tools',
    question: 'Hermes 里工具的并行与串行是谁决定的？主循环里有真正的并行吗？',
    hint: '看一轮 response 里 tool_calls 数组的形状，再想想 batch delegate。',
    answer:
      '由模型的单次响应决定：response.tool_calls 里有几个 call，循环就依次执行几个、逐个 append 结果，' +
      '然后 api_call_count+1 进入下一轮。也就是说「同一轮多个 tool_calls」是模型表达的并行语义，' +
      '执行层按数组顺序处理，主循环内没有并发执行框架。真正的并行发生在 delegate_task 的 batch tasks：' +
      'tasks: [...] 每个元素起一个独立 subagent 并发跑，受 delegation.max_concurrent_children（默认 3）限制。' +
      '这个分工很干净：循环内保持串行的确定性，并发被推到有隔离边界的委派层。',
    followUps: [
      '同轮多个 tool_calls 的结果顺序重要吗？——按数组顺序 append，消息流与模型的调用一一对应。',
      '真正的并行在哪里、有什么隔离？——batch delegate：每个 subagent 有独立上下文与 terminal session。',
      '为什么不在主循环内并发执行工具？——工具间可能有依赖（写文件再读），串行保持确定性；要并发就用委派换隔离。',
    ],
    rubric: [
      '并行/串行由模型响应的 tool_calls 形状决定',
      '循环内串行执行，保证确定性与消息一一对应',
      '真并行在 batch delegate，有并发上限与隔离边界',
    ],
  },
  {
    id: 'after-loop',
    question: '主循环结束后 Hermes 还做了什么？这对系统设计意味着什么？',
    hint: '会话落盘到哪里？谁在 on_session_end 钩子里干活？',
    answer:
      '三个出口（正常返回 / 触碰上限 / 用户中断）之后：会话写入 SessionDB（hermes_state.py，SQLite + FTS5，' +
      '支撑跨会话全文搜索）；on_session_end 插件钩子触发，记忆 provider 在这里 sync_turn，把这一轮同步到 ' +
      'honcho / mem0 等后端；之后 curator 这类后台系统才上场（跟踪技能使用、自动归档）。' +
      '这意味着主循环只负责「这一轮的智能」，持久化与学习循环被解耦到会话边界之后。' +
      '而且这个解耦是可配置的：cron 会话默认 skip_memory=True，记忆 provider 在定时任务里故意不跑。',
    followUps: [
      '为什么记忆同步不放在循环内？——循环内追加任何上下文都破缓存；会话边界是天然的持久化检查点。',
      'cron 为什么 skip_memory？——定时任务是无头会话，记忆读写既无意义又增加延迟与不确定性。',
      'FTS5 索引带来什么能力？——跨会话搜索自己的历史（session_search），是「自进化」的数据底座。',
    ],
    rubric: [
      '知道会话落盘 SessionDB（SQLite + FTS5）',
      '知道 on_session_end 钩子与记忆 sync_turn 的边界',
      '理解主循环与后台学习系统的解耦，且解耦可配置（skip_memory）',
    ],
  },
];

export const SELF_ASSESSMENT_TOPICS: SelfAssessmentTopic[] = [
  { id: 'loop', topic: 'Agent 主循环', sourceRef: 'run_agent.py · AGENTS.md §AIAgent Class' },
  {
    id: 'caching',
    topic: 'Prompt caching 铁律',
    sourceRef: 'AGENTS.md §Prompt Caching Must Not Break',
  },
  {
    id: 'tools',
    topic: '工具注册与 toolsets',
    sourceRef: 'tools/registry.py + toolsets.py · §Adding New Tools',
  },
  {
    id: 'skills',
    topic: '技能与策展器',
    sourceRef: 'skills/ + agent/curator.py · §Skills / §Curator',
  },
  {
    id: 'memory',
    topic: '记忆架构',
    sourceRef: 'hermes_state.py + plugins/memory/ · §Memory-provider plugins',
  },
  { id: 'delegation', topic: '委派系统', sourceRef: 'tools/delegate_tool.py · §Delegation' },
  { id: 'gateway', topic: '消息网关', sourceRef: 'gateway/run.py + gateway/platforms/' },
  { id: 'cron', topic: 'Cron 定时调度', sourceRef: 'cron/jobs.py + cron/scheduler.py · §Cron' },
  { id: 'tui', topic: 'TUI 架构', sourceRef: 'ui-tui/ + tui_gateway/ · §TUI Architecture' },
  {
    id: 'cli',
    topic: 'CLI 架构',
    sourceRef: 'cli.py + hermes_cli/commands.py · §CLI Architecture',
  },
  { id: 'profiles', topic: 'Profiles 多实例', sourceRef: 'hermes_constants.py · §Profiles' },
  { id: 'plugins', topic: '插件系统', sourceRef: 'plugins/ + hermes_cli/plugins.py · §Plugins' },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const INTERVIEW_INTRO_EN =
  'Interviewers probe the agent loop not to hear you recite concepts, but to see whether you can ' +
  'reason about the trade-offs of a real system. Each card below is a real loop-design question: ' +
  'read the question and the thinking hint first, organize your own answer (silently or in the ' +
  "thinking zone), then flip to compare against a model answer grounded in Hermes' real design. " +
  'Not being able to answer is fine — walk the follow-up chain too, and once you can explain it ' +
  'clearly, mark "I can answer this".';

export const LOOP_QUESTIONS_EN: LoopQuestion[] = [
  {
    id: 'sync-while',
    question:
      "Why is Hermes' agent main loop a synchronous while loop instead of an event-driven or async architecture?",
    hint: 'Think about dependencies within a single session, debugging cost, and which layer streaming output lives in.',
    answer:
      'The loop lives in run_conversation(); AGENTS.md states it is "entirely synchronous, with interrupt checks, ' +
      'budget tracking, and a one-turn grace call". A synchronous while keeps control flow fully explicit: each ' +
      'iteration is "check interrupt → call model → execute any tool_calls and append → count", and both budget ' +
      'and interrupt are part of the loop condition. Within a single session every step strongly depends on the ' +
      'previous one, so event-driven concurrency buys almost nothing while shattering this sequential chain into ' +
      'a callback state machine. Perceptual complexity is pushed to the display layer (CLI spinner, TUI ' +
      'message.delta events) and never pollutes the loop itself. Real concurrency happens outside the loop: ' +
      "delegate_task batch tasks and the gateway's multi-platform ingress.",
    followUps: [
      'How are concurrency needs handled then? — Concurrency lives at the delegate_task tasks-array level (capped by delegation.max_concurrent_children, default 3); the main loop stays serial.',
      'Where does human approval block? — It waits synchronously in a hook before tool execution; the loop itself is blocking, so no extra state machine is needed.',
      'How do background delegate results return to the session? — Via the async-delegation completion queue, injected in a later turn instead of interrupting the current loop.',
    ],
    rubric: [
      'Explains "synchronous ≠ no async boundaries" and can point out which layers are async',
      'Knows streaming output is handled at the display layer, not in the main loop',
      'Can analyze the real cost of event-driven design here (state-machine complexity vs zero concurrency gain)',
    ],
  },
  {
    id: 'append-only',
    question:
      'Why does Hermes only append to the message stream and never rewrite historical messages?',
    hint: 'This is directly about money — think about what invalidates the prompt cache.',
    answer:
      'Hermes\' first design constraint is per-conversation prompt caching (AGENTS.md "Prompt Caching Must Not ' +
      'Break"): every turn of a long conversation reuses the cached prefix. Any in-place modification of past ' +
      'context — editing historical messages, swapping toolsets mid-session, rebuilding the system prompt — ' +
      'invalidates the whole cache and forces full recompute on every later turn, at huge cost. So the message ' +
      'stream only grows: tool results are appended as role="tool" messages, and even skill slash commands are ' +
      'injected as user messages instead of rewriting the system prompt. The sole exception is context ' +
      'compression: a deliberate, one-time invalidation that buys back context-window space. Every other change ' +
      'defaults to deferred invalidation (takes effect next session); only --now invalidates immediately.',
    followUps: [
      'What if the user runs /skills install mid-session? — By default it writes config and takes effect next session; --now applies immediately and accepts the cache-invalidation cost.',
      "Doesn't compression also rewrite history? — Yes, it is the only allowed exception: a dead context window costs more than a one-time cache miss, and the new compressed prefix gets re-cached from the next turn on.",
      "What if the provider doesn't support caching? — The policy doesn't change; append-only also buys correctness and auditability.",
    ],
    rubric: [
      'Clearly explains the causal link between append-only and cache hit rate',
      'Knows the sole exception is context compression and why',
      'Knows the --now / deferred invalidation pattern',
    ],
  },
  {
    id: 'budget',
    question:
      'How are max_iterations=90 and the iteration budget designed? Why not a simple for-loop counter?',
    hint: 'Notice the loop condition has three parts, and why the grace call exists.',
    answer:
      'The loop condition is `(api_call_count < max_iterations and iteration_budget.remaining > 0) or _budget_grace_call`. ' +
      'max_iterations defaults to 90 and is a global ceiling shared with subagents — subagents inherit the same ' +
      'magnitude, and together with delegation.max_spawn_depth=2 it caps the total work of the whole delegation ' +
      'tree. iteration_budget is a finer budget dimension; the loop also stops when the budget runs out first. ' +
      'The one-turn grace call is the key detail: after the budget is exhausted the model still gets one final ' +
      'turn to wrap its findings into a final answer, instead of a hard cut that leaves a dangling session. The ' +
      'loop has three exits: the model returns plain text (normal completion), the cap is hit (forced wrap-up), ' +
      'or the user interrupts.',
    followUps: [
      "Why do subagents share the same cap? — To prevent runaway recursion; delegation.max_iterations can override it, but by default they inherit the main agent's magnitude.",
      'What does the user see when the budget runs out? — The wrap-up answer produced by the grace call, not a truncated tool result.',
      "Why can't there be no cap? — The agent could spin in a tool-call loop forever; the cap is cost control and fault isolation.",
    ],
    rubric: [
      'Can recite the three parts of the loop condition (iterations / budget / grace call)',
      "Understands the grace call's motivation: a graceful wrap-up instead of a hard cut",
      'Knows the cap is shared with subagents and works with spawn depth to lock the total',
    ],
  },
  {
    id: 'interrupt',
    question:
      'When a user presses Esc in the CLI to interrupt the agent, how does the loop handle it? Why not exceptions?',
    hint: 'Where in the loop is the interrupt flag checked? What happens mid-tool-execution?',
    answer:
      'At the top of every iteration the loop checks `self._interrupt_requested` and breaks if set — it is the ' +
      'first line of the loop pseudocode in AGENTS.md. Interrupt is designed as part of the loop condition: Esc ' +
      'only sets a flag, and the agent exits at the next iteration boundary, a "safe point", instead of being ' +
      'torn apart mid-tool by an exception. This guarantees the message stream stays consistent (no half-finished ' +
      'tool_call left hanging) and the session can wrap up gracefully and persist normally. The same mechanism ' +
      'serves system-level interrupts: cron sessions get a 3-minute hard interrupt, so a runaway agent loop ' +
      'cannot drag down the scheduler.',
    followUps: [
      'Why not hard-interrupt mid-tool? — It would leave unpaired messages (a tool_call with no tool result), breaking message-stream consistency and the cache prefix.',
      'Can the session continue after an interrupt? — The message stream is persisted intact (SessionDB), so it can be resumed.',
      'An example of a system-level interrupt? — The cron 3-minute hard interrupt: same flag mechanism, but triggered by a watchdog instead of the user.',
    ],
    rubric: [
      'Flag bit + iteration-boundary checkpoint, not exception-based interruption',
      'Can contrast the state-consistency problem of the exception approach (half-finished tool_call)',
      'Can cite the cron 3-minute hard interrupt as a system-level example',
    ],
  },
  {
    id: 'json-results',
    question:
      'Why must all tool handlers return JSON strings instead of Python objects or natural-language paragraphs?',
    hint: "Think about what the registry must do without knowing each tool's internal types.",
    answer:
      'AGENTS.md states "All handlers MUST return a JSON string". The registry uniformly handles schema ' +
      "collection, dispatch, availability checks, and error wrapping — it should not be aware of each tool's " +
      'internal types; a uniform string boundary lets it generically truncate/summarize to protect the context ' +
      'window. Results are wrapped by tool_result_message into an OpenAI role="tool" message and appended. ' +
      'Structured JSON (success/data/error fields) lets the model reliably parse success vs failure: errors are ' +
      'also wrapped as normal result messages instead of being raised, so the agent sees the failure and ' +
      'self-corrects, and the loop never crashes because one tool threw.',
    followUps: [
      'What if a tool throws internally? — The registry wraps it into an error JSON; the agent sees it next turn and self-corrects.',
      'How are large results handled? — Uniform truncation/summarization to protect the context window; a string boundary is what makes generic handling possible.',
      "Why not let the model read a Python object's repr? — Unstable output schemas trip the model's parsing; JSON fields are a dependable contract.",
    ],
    rubric: [
      "Uniform boundary: the registry is agnostic to tools' internal types",
      'Errors-as-result-messages: the agent can self-correct and the loop never crashes',
      'Friendly to context protection (truncation/summarization)',
    ],
  },
  {
    id: 'register-vs-expose',
    question:
      'Why is writing tools/your_tool.py not enough to add a new tool — why must you also register it in toolsets.py?',
    hint: 'Distinguish "registered into the registry" from "exposed to the agent".',
    answer:
      'Auto-discovery only handles registration: any tools/*.py module that calls registry.register() at top ' +
      'level registers its schema on import — no manual import list. But exposing a tool to the agent is a ' +
      'separate, deliberate step — the tool name must appear in the TOOLSETS dict in toolsets.py. Benefits of ' +
      'the split: a controllable schema footprint, e.g. a kanban worker has zero tool footprint outside kanban ' +
      'tasks; per-platform tailoring, where Telegram uses the messaging toolset and every platform inherits ' +
      '_HERMES_CORE_TOOLS by default; and check_fn / requires_env automatically hiding tools when the ' +
      'environment doesn\'t qualify. Calling out "registration ≠ exposure" in an interview shows you have thought ' +
      "about tool visibility as a cost — every schema consumes context and dilutes the model's attention.",
    followUps: [
      'Why control the schema footprint? — Every tool schema ships with the messages, costs tokens, dilutes attention, and raises the chance of wrong calls.',
      'Must local custom tools touch core code? — No, use the plugin route: ctx.register_tool(...) in ~/.hermes/plugins/<name>/, leaving tools/ and toolsets.py untouched.',
      'What does check_fn do? — Environment checks (e.g. whether an API key exists); the tool is hidden when they fail.',
    ],
    rubric: [
      'Explains registration and exposure as two layers and what each does',
      'Knows the role of _HERMES_CORE_TOOLS (the default bundle every platform inherits)',
      'Understands the cost of schema footprint and per-platform/scenario tailoring',
    ],
  },
  {
    id: 'compression-exception',
    question: 'Why is context compression the sole exception to the "cache iron rule"?',
    hint: "Compression also rewrites history — why doesn't it break its own rule?",
    answer:
      'The iron rule forbids altering past context / changing toolsets / rebuilding the system prompt ' +
      'mid-session, because any rewrite invalidates the prompt cache. Compression also rewrites history, but it ' +
      'is a deliberate, one-time invalidation: when the message stream approaches the context-window limit, not ' +
      'compressing means the session simply dies — a one-time cache miss costs far less than losing the session. ' +
      'The new prefix formed by compression gets re-cached from the next turn on, and costs fall back. The key ' +
      'word is "sole": every other change (installing skills, changing toolsets, reloading memory) goes through ' +
      'deferred invalidation, taking effect next session by default and immediately only with --now. Converging ' +
      'on exactly one exception is what makes the rule enforceable.',
    followUps: [
      'Who decides when to compress? — Context-window pressure drives it; it is the only permitted context-mutation point in the loop.',
      'What about information lost in compression? — That is a compression-quality problem; engineering-wise, guaranteeing it happens once and the cache rebuilds afterwards is the cost-level backstop.',
      'Why not allow "a few more exceptions"? — Once exceptions generalize, the cache hit rate becomes unpredictable and the cost model collapses.',
    ],
    rubric: [
      'Admits compression also breaks the cache — no sophistry',
      'Explains the trade-off: one-time invalidation vs session death',
      'Knows the new prefix re-enters the cache afterwards, and all other changes go through deferred invalidation',
    ],
  },
  {
    id: 'skill-injection',
    question:
      'Why are skill slash commands injected as user messages instead of updating the system prompt?',
    hint: 'Which position in the cache prefix is the most "untouchable"?',
    answer:
      'After scanning ~/.hermes/skills/, agent/skill_commands.py injects skill content as a user message — ' +
      'AGENTS.md\'s own words: "injects as user message (not system prompt) to preserve prompt caching". The ' +
      'system prompt sits at the very head of the cache prefix; touching it invalidates the entire prefix, while ' +
      'a user message is appended at the tail and leaves the prefix untouched. The cost is that skill ' +
      'instructions carry less authority than the system prompt — trading message role for cache hit rate is a ' +
      "classic example of Hermes' cache-first design. The pattern is consistent across the repo: any operation " +
      'that would change system-prompt state is deferred by default and takes effect next session.',
    followUps: [
      'Side effects of injecting as a user message? — Weaker authority than the system prompt; the model may not comply. That trade-off is deliberate.',
      'Why is the head of the prefix most sensitive? — Prefix caching matches by prefix; once the head changes, everything after it is invalidated.',
      'Where else does the same trade-off appear? — /tools and memory-related commands all default to deferred invalidation; only --now takes effect immediately.',
    ],
    rubric: [
      'Knows the position sensitivity of prefix caching: touching the head = invalidating everything',
      'Explains the trade-off between appending a user message and rewriting the system prompt',
      'Can point out this is a repo-wide pattern (deferred invalidation)',
    ],
  },
  {
    id: 'parallel-tools',
    question:
      'In Hermes, who decides whether tools run in parallel or serially? Is there real parallelism in the main loop?',
    hint: 'Look at the shape of the tool_calls array in a single response, then think about batch delegate.',
    answer:
      "The model's single response decides: however many calls sit in response.tool_calls, the loop executes " +
      'that many in order, appends each result, then increments api_call_count and enters the next turn. In other ' +
      'words, "multiple tool_calls in one turn" is parallelism expressed by the model; the execution layer ' +
      'processes them in array order and there is no concurrent execution framework inside the main loop. Real ' +
      'parallelism happens in delegate_task batch tasks: each element of tasks: [...] spawns an independent ' +
      'subagent running concurrently, capped by delegation.max_concurrent_children (default 3). The division of ' +
      'labor is clean: serial determinism inside the loop, concurrency pushed to the delegation layer with ' +
      'isolation boundaries.',
    followUps: [
      "Does the result order of same-turn tool_calls matter? — They are appended in array order, so the message stream corresponds one-to-one with the model's calls.",
      'Where is real parallelism, and with what isolation? — Batch delegate: each subagent has its own context and terminal session.',
      'Why not run tools concurrently inside the main loop? — Tools may depend on each other (write a file, then read it); serial execution preserves determinism. For concurrency, delegate and get isolation.',
    ],
    rubric: [
      "Parallel vs serial is determined by the shape of the model response's tool_calls",
      'Serial execution inside the loop guarantees determinism and one-to-one message correspondence',
      'Real parallelism lives in batch delegate, with a concurrency cap and isolation boundaries',
    ],
  },
  {
    id: 'after-loop',
    question:
      'What does Hermes do after the main loop ends? What does that imply for system design?',
    hint: 'Where is the session persisted? Who works in the on_session_end hook?',
    answer:
      'After the three exits (normal return / cap hit / user interrupt): the session is written to SessionDB ' +
      '(hermes_state.py, SQLite + FTS5, powering cross-session full-text search); the on_session_end plugin hook ' +
      'fires, and memory providers run sync_turn there, syncing this turn to backends like honcho / mem0; only ' +
      'then do background systems like the curator take the stage (tracking skill usage, auto-archiving). This ' +
      'means the main loop is only responsible for "this turn\'s intelligence"; persistence and the learning ' +
      'loop are decoupled past the session boundary. And the decoupling is configurable: cron sessions default ' +
      'to skip_memory=True, deliberately skipping memory providers in scheduled jobs.',
    followUps: [
      "Why isn't memory sync inside the loop? — Anything appended to context inside the loop breaks the cache; the session boundary is the natural persistence checkpoint.",
      'Why does cron skip memory? — Scheduled jobs are headless sessions; memory reads/writes are meaningless there and only add latency and uncertainty.',
      'What capability does the FTS5 index bring? — Searching your own history across sessions (session_search) — the data foundation of "self-evolution".',
    ],
    rubric: [
      'Knows sessions persist to SessionDB (SQLite + FTS5)',
      'Knows the boundary between the on_session_end hook and memory sync_turn',
      'Understands the decoupling of the main loop from background learning systems, and that it is configurable (skip_memory)',
    ],
  },
];

export const SELF_ASSESSMENT_TOPICS_EN: SelfAssessmentTopic[] = [
  { id: 'loop', topic: 'Agent main loop', sourceRef: 'run_agent.py · AGENTS.md §AIAgent Class' },
  {
    id: 'caching',
    topic: 'Prompt-caching iron rule',
    sourceRef: 'AGENTS.md §Prompt Caching Must Not Break',
  },
  {
    id: 'tools',
    topic: 'Tool registration & toolsets',
    sourceRef: 'tools/registry.py + toolsets.py · §Adding New Tools',
  },
  {
    id: 'skills',
    topic: 'Skills & curator',
    sourceRef: 'skills/ + agent/curator.py · §Skills / §Curator',
  },
  {
    id: 'memory',
    topic: 'Memory architecture',
    sourceRef: 'hermes_state.py + plugins/memory/ · §Memory-provider plugins',
  },
  {
    id: 'delegation',
    topic: 'Delegation system',
    sourceRef: 'tools/delegate_tool.py · §Delegation',
  },
  { id: 'gateway', topic: 'Message gateway', sourceRef: 'gateway/run.py + gateway/platforms/' },
  { id: 'cron', topic: 'Cron scheduling', sourceRef: 'cron/jobs.py + cron/scheduler.py · §Cron' },
  { id: 'tui', topic: 'TUI architecture', sourceRef: 'ui-tui/ + tui_gateway/ · §TUI Architecture' },
  {
    id: 'cli',
    topic: 'CLI architecture',
    sourceRef: 'cli.py + hermes_cli/commands.py · §CLI Architecture',
  },
  {
    id: 'profiles',
    topic: 'Profiles (multi-instance)',
    sourceRef: 'hermes_constants.py · §Profiles',
  },
  {
    id: 'plugins',
    topic: 'Plugin system',
    sourceRef: 'plugins/ + hermes_cli/plugins.py · §Plugins',
  },
];

// ── 实验室专属 UI 文案（InterviewLab / SelfAssessmentLab） ──────────

export const INTERVIEW_UI = {
  progressLabel: { zh: '攻克进度', en: 'Mastery progress' },
  masteredSuffix: { zh: '题已攻克', en: 'mastered' },
  allMastered: {
    zh: '全部攻克——别忘了把追问链也过一遍，面试官真正拉开差距的地方在那里。',
    en: "All mastered — don't forget to walk the follow-up chains too; that is where interviewers really separate candidates.",
  },
  isMastered: { zh: '✓ 能答上来了', en: '✓ I can answer this' },
  markMastered: { zh: '标记：能答上来了', en: 'Mark: I can answer this' },
  hintLabel: { zh: '思考提示', en: 'HINT' },
  thinkFirst: { zh: '我先想想', en: 'Think first' },
  thinkFirstBody: {
    zh: '别急着翻。用 60 秒在脑子里组织一遍：先给结论，再给机制，最后给一个 Hermes 里的真实例子。',
    en: "Don't flip yet. Take 60 seconds to organize your answer: conclusion first, then the mechanism, then a real Hermes example.",
  },
  modelAnswer: { zh: '模范思路', en: 'MODEL ANSWER' },
  followUps: { zh: '追问链', en: 'FOLLOW-UPS' },
  rubric: { zh: '评分维度', en: 'RUBRIC' },
};

// 自评档位定义：label/desc 按语言取值，level 数值与 AssessmentLevel 对齐。
export const SELF_ASSESSMENT_LEVELS: {
  level: 1 | 2 | 3;
  label: { zh: string; en: string };
  desc: { zh: string; en: string };
}[] = [
  {
    level: 1,
    label: { zh: '能讲清', en: 'Can explain' },
    desc: {
      zh: '能向外行讲明白它是什么、为什么存在',
      en: 'Can explain to a layperson what it is and why it exists',
    },
  },
  {
    level: 2,
    label: { zh: '能设计', en: 'Can design' },
    desc: {
      zh: '能复刻它的设计，并讲清关键取舍',
      en: 'Can reproduce its design and explain the key trade-offs',
    },
  },
  {
    level: 3,
    label: { zh: '能答追问', en: 'Survives follow-ups' },
    desc: {
      zh: '经得住追问链：边界、故障、替代方案',
      en: 'Withstands the follow-up chain: boundaries, failures, alternatives',
    },
  },
];

export const SELF_ASSESSMENT_UI = {
  introLead: {
    zh: '面试前最后一道手续是诚实的自评。对着下面 12 个主题逐一点选你达到的最高档位：',
    en: 'The last step before the interview is an honest self-assessment. For each of the 12 topics below, pick the highest level you have reached:',
  },
  introHint1: { zh: '（可以说给外行听）', en: '(can explain it to a layperson)' },
  introHint2: {
    zh: '（能复刻设计并讲清取舍）',
    en: '(can reproduce the design and explain the trade-offs)',
  },
  introHint3: {
    zh: '（经得住边界、故障与替代方案的连环问）',
    en: '(withstands a chain of boundary, failure, and alternative questions)',
  },
  introTail: {
    zh: '再点一次当前档位可以撤回。底部会汇总出你的薄弱项——每一条都附了回链， 面试前把档位 <2 的主题补齐。',
    en: 'Click the current level again to undo. Your weak topics are summarized at the bottom — each with a link back to the source. Before the interview, bring every topic below level 2 up to par.',
  },
  topicHeader: { zh: '主题', en: 'Topic' },
  overallProgress: { zh: '总进度', en: 'Overall progress' },
  evaluated: { zh: '已评估', en: 'Evaluated' },
  distByLevel: { zh: '按档位分布', en: 'Distribution by level' },
  level0Name: { zh: '0 · 未评估 / 讲不清', en: "0 · Not assessed / can't explain" },
  weakTitlePrefix: { zh: '薄弱项（档位 <2，', en: 'Weak topics (level <2, ' },
  weakTitleSuffix: { zh: ' 个）', en: ')' },
  noWeak: {
    zh: '没有薄弱项——12 个主题全部达到「能设计」以上。去把第 23 章的追问链再过一遍， 然后放平心态去面试。',
    en: 'No weak topics — all 12 are at "Can design" or above. Walk the follow-up chains in Chapter 23 once more, then go into the interview relaxed.',
  },
  currentLevel: { zh: '当前档位', en: 'Current level' },
  reviewLink: { zh: '回炉 → ', en: 'Review → ' },
};
