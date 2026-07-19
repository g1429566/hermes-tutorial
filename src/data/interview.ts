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
