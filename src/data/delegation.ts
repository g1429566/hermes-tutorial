// Chapter 09「委派系统」数据源：委派时序步进器 + background/batch/role 三小节。
// 内容对齐 hermes-agent/AGENTS.md 的「Delegation (delegate_task)」一节，
// 代码片段摘自 tools/delegate_tool.py 与 tools/async_delegation.py（手动摘录）。

export interface DelegationStep {
  id: string;
  label: string;
  title: string;
  body: string;
  code: { file: string; lines: string; snippet: string; note?: string };
  events: { name: string; desc: string }[];
  points: string[];
}

export const DELEGATION_INTRO =
  '当任务太大、太杂，或者需要并行时，parent agent 调用 delegate_task 把子目标派生（spawn）给一个' +
  '子 agent：它有隔离的 context 和隔离的 terminal session，跑自己的 tool_calls 循环，最后只把一份 ' +
  'summary 交回 parent。点击下面五个步骤，跟随一次委派从发起到聚合的完整时序。';

export const DELEGATION_STEPS: DelegationStep[] = [
  {
    id: 'call',
    label: 'DELEGATE',
    title: 'parent 调用 delegate_task(goal)',
    body: 'parent 在自己的 tool_calls 循环里发起一次普通工具调用：单个任务传 goal（可带 context），批量并行传 tasks: [...]。返回值是 JSON——同步模式下是每个任务一条的 results 数组。parent 的会话消息流里只追加这一条工具结果，子 agent 的全过程不进 parent 的 context。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'delegate_task()',
      snippet: `def delegate_task(
    goal: Optional[str] = None,
    context: Optional[str] = None,
    tasks: Optional[List[Dict[str, Any]]] = None,
    max_iterations: Optional[int] = None,
    role: Optional[str] = None,
    background: Optional[bool] = None,
    parent_agent=None,
) -> str:
    """Spawn one or more child agents to handle delegated tasks.

      - Single: provide goal (+ optional context and role)
      - Batch:  provide tasks array [{goal, context, role}, ...]
    """`,
      note: 'parent_agent 由框架注入；模型只填 goal / tasks / role / background',
    },
    events: [
      { name: 'pre_tool_call', desc: '插件钩子审计参数' },
      { name: 'tool.execute', desc: 'registry 分发到 delegate_task handler' },
    ],
    points: [
      '单个任务传 goal；批量并行传 tasks: [{goal, context, role}, ...]',
      'per-task 的 role 覆盖顶层 role（_normalize_role 逐个归一化）',
      'operator 可通过 TUI /agents 或 delegation.pause RPC 暂停新的派生',
    ],
  },
  {
    id: 'spawn',
    label: 'SPAWN',
    title: 'spawn 子 agent：隔离 context + terminal session',
    body: '_build_child_agent 为每个任务构造一个全新的 AIAgent：隔离的对话 context（不共享 parent 的消息流）、隔离的 terminal session。子 agent 继承 parent 的 toolsets，但先过一遍黑名单剥离——leaf 角色永远拿不到 delegate_task / clarify / memory / send_message / execute_code / cronjob。危险命令审批在子线程里默认 auto-deny（delegation.subagent_auto_approve 默认 false），绝不阻塞 parent 的输入界面。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'DELEGATE_BLOCKED_TOOLS',
      snippet: `# Tools that children must never have access to
DELEGATE_BLOCKED_TOOLS = frozenset(
    [
        "delegate_task",  # no recursive delegation
        "clarify",        # no user interaction
        "memory",         # no writes to shared MEMORY.md
        "send_message",   # no cross-platform side effects
        "execute_code",   # children should reason step-by-step
        "cronjob",        # no scheduling more work in the parent's name
    ]
)`,
      note: 'role="orchestrator" 会从黑名单里移除 delegate_task，其余照禁',
    },
    events: [
      { name: 'child.build', desc: '_build_child_agent 构造隔离的 AIAgent' },
      { name: 'toolset.strip', desc: '_strip_blocked_tools 按角色剥离工具' },
    ],
    points: [
      '隔离 terminal session：子 agent 的命令执行环境独立于 parent',
      '未知 role 字符串会被归一化为 leaf 并记 warning',
      '子 agent 继承 parent toolsets；MCP toolsets 由 inherit_mcp_toolsets 控制',
    ],
  },
  {
    id: 'loop',
    label: 'CHILD LOOP',
    title: '子 agent 跑自己的 tool_calls 循环',
    body: '每个子 agent 在线程池里由 _run_single_child 驱动，跑和第 04 章完全相同的主循环：组装消息 → 调模型 → 执行工具 → 追加结果。迭代上限与 parent 共享 max_iterations（默认 90）。运行期间子 agent 定期向 parent 传播心跳，网关的 inactivity 超时不会误杀正在等孩子的 parent。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '_run_single_child()',
      snippet: `def _run_single_child(
    task_index: int,
    goal: str,
    child=None,
    parent_agent=None,
    **_kwargs,
) -> Dict[str, Any]:
    """Run a pre-built child agent. Called from within a thread.
    Returns a structured result dict."""`,
      note: '批量任务时 N 个 _run_single_child 并发跑在线程池里',
    },
    events: [
      { name: 'child.turn', desc: '子 agent 自己的模型调用与工具执行' },
      { name: 'heartbeat', desc: '子 agent 活动心跳传播给 parent' },
    ],
    points: [
      'max_iterations 默认 90，父子共享同一上限',
      'delegation.child_timeout_seconds 给子任务整体兜底',
      '中断标志按 subagent_id 注册，可单独 interrupt_subagent',
    ],
  },
  {
    id: 'return',
    label: 'RETURN',
    title: '子 agent 返回 summary',
    body: '子 agent 循环结束后，只提炼出一份结构化 summary（输出尾部摘要），而不是把几十轮中间消息倒回 parent。这就是 context 隔离的意义：parent 的上下文窗口不被子任务的中间过程污染，prompt cache 也不受影响。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'AGENTS.md §Delegation',
      snippet: `# By default the parent waits for the child's summary
# before continuing its own loop.
#
# 子 agent 的中间消息不进 parent 的 context——
# parent 看到的只有这一条工具结果（summary）。`,
    },
    events: [{ name: 'child.done', desc: '子任务收尾，提取输出尾部作为 summary' }],
    points: [
      'summary 是唯一穿越隔离边界的产物',
      '失败/中断也被包装成结构化结果，parent 能看到并自我修复',
      '大输出只取尾部摘要，保护 parent 的上下文窗口',
    ],
  },
  {
    id: 'aggregate',
    label: 'AGGREGATE',
    title: 'parent 聚合结果，继续自己的循环',
    body: '同步模式下 results 数组作为 delegate_task 的工具结果追加进 parent 的消息流，parent 在下一次模型调用中读到所有子任务的 summary，据此继续推理——可能再派一轮、汇总给用户、或动手整合子任务产出的代码。一次委派在 parent 的消息流里只占了「一次调用 + 一条结果」。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '同步返回路径',
      snippet: `# Returns JSON with results array, one entry per task.
#
# messages.append(tool_result_message(result))
# → parent 的循环继续，缓存前缀不变`,
    },
    events: [
      { name: 'message.append', desc: 'results JSON 作为 tool 消息回写' },
      { name: 'post_tool_call', desc: '插件钩子：结果后处理' },
    ],
    points: [
      '消息流只 append——委派不破坏 prompt caching',
      'parent 决定下一步：继续派生、汇总、或直接行动',
      '子 agent 的成本在 _run_single_child 里已计入 parent 的统计',
    ],
  },
];

/* ── 三小节数据：background 异步 / batch 并行 / role 差异 ────────── */

export interface DelegationNote {
  id: string;
  kicker: string;
  title: string;
  body: string;
  code: { file: string; snippet: string; note?: string };
  points: string[];
}

export const DELEGATION_NOTES: DelegationNote[] = [
  {
    id: 'background',
    kicker: '异步委派',
    title: 'background=true：立即返回，结果走完成队列',
    body: '传 background=true 时 delegate_task 不再阻塞：parent 立刻拿到一个 delegation_id 继续对话，子任务在后台执行。全部子任务完成后，一个 type="async_delegation" 的完成事件被推进 process_registry.completion_queue，CLI 与网关既有的 drain 逻辑在 agent 空闲时把它作为一条新消息重新注入会话。批量任务作为一个异步单元：等所有孩子结束后只推送一次聚合结果。注意持久性边界：background 委派脱离了当前轮次，但仍是进程本地的——进程重启就丢了。需要跨重启存活的工作，用 cronjob 或 terminal(background=True, notify_on_complete=True)。',
    code: {
      file: 'tools/async_delegation.py',
      snippet: `# 完成事件推进共享队列，复用 CLI + gateway 既有的 drain  wiring：
process_registry.completion_queue.put(evt)  # type="async_delegation"

# delegate_task 立即返回：
{ "status": "dispatched", "mode": "background",
  "delegation_id": dispatch["delegation_id"], ... }`,
      note: '异步并发同样受 max_concurrent_children 封顶，防止失控堆积',
    },
    points: [
      'parent 不等、不轮询——继续和用户对话即可',
      '批量后台任务聚合为单个完成事件重新进入会话',
      '持久性规则：跨进程重启的活儿交给 cronjob，不要交给 background 委派',
    ],
  },
  {
    id: 'batch',
    kicker: '并行 fan-out',
    title: 'batch tasks:[]：一次调用，N 个子 agent 并行',
    body: '传 tasks: [{goal, ...}, ...] 一次派生多个子 agent 并发执行。并发度由 delegation.max_concurrent_children 封顶（默认 3）——同一个上限同时约束同步批量的并行度和后台委派的排队数量，失控的模型没法堆出无界 fan-out。config.yaml 里 delegation: 下的其他旋钮：max_spawn_depth、child_timeout_seconds、orchestrator_enabled、subagent_auto_approve、inherit_mcp_toolsets、max_iterations。',
    code: {
      file: 'tools/delegate_tool.py',
      snippet: `_DEFAULT_MAX_CONCURRENT_CHILDREN = 3

# config.yaml
# delegation:
#   max_concurrent_children: 3   # 并发上限（同步批量 + 后台队列共用）
#   max_spawn_depth: 2           # 嵌套委派深度
#   child_timeout_seconds: ...   # 子任务整体超时`,
      note: '配置超过 10 会记一次性高并发成本警告（每个子 agent 都烧 API tokens）',
    },
    points: [
      '批量返回一个 handle / 一个 results 数组——parent 只看到一次工具调用',
      '每个子 agent 独立 context、独立 terminal session',
      '超出并发上限的任务排队等待，而不是被拒绝',
    ],
  },
  {
    id: 'role',
    kicker: '角色分层',
    title: 'role=leaf 与 role=orchestrator 的差异',
    body: 'leaf（默认）是专注的执行者：DELEGATE_BLOCKED_TOOLS 整组禁用，它不能再派生、不能问用户、不能写共享记忆、不能跨平台发消息。orchestrator 保留 delegate_task，可以派生自己的 worker 组成嵌套树——由 delegation.orchestrator_enabled（默认 true）总控，嵌套深度受 delegation.max_spawn_depth 限制（默认 2：parent → child → grandchild 为止）。',
    code: {
      file: 'tools/delegate_tool.py',
      snippet: `def _blocked_toolsets_for_role(role: str) -> List[str]:
    blocked_names = set(DELEGATE_BLOCKED_TOOLS)
    if role == "orchestrator":
        blocked_names.discard("delegate_task")  # 唯一解禁的工具
    ...`,
      note: 'orchestrator 的孩子默认仍是 leaf——深度天然收敛',
    },
    points: [
      'leaf 禁：delegate_task / clarify / memory / send_message / execute_code / cronjob',
      'orchestrator 只解禁 delegate_task，其余黑名单照旧',
      'max_spawn_depth 默认 2，floor 为 1、无上限封顶（自行承担成本）',
    ],
  },
];

export const DELEGATION_HOOK =
  'delegate_task = spawn 一个隔离的 AIAgent 跑完整主循环，只把 summary 塞回 parent 的消息流。' +
  '同步阻塞等结果，background=true 走 completion queue 异步回灌；批量 tasks:[] 受 ' +
  'max_concurrent_children=3 封顶；leaf 不能再派生，orchestrator 可以但深度 ≤2。';

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const DELEGATION_INTRO_EN =
  'When a task is too big, too messy, or needs parallelism, the parent agent calls delegate_task ' +
  'to spawn a child agent for the sub-goal: it gets an isolated context and an isolated terminal ' +
  'session, runs its own tool_calls loop, and hands back only a summary. Click through the five ' +
  'steps below to follow a full delegation from dispatch to aggregation.';

export const DELEGATION_STEPS_EN: DelegationStep[] = [
  {
    id: 'call',
    label: 'DELEGATE',
    title: 'parent calls delegate_task(goal)',
    body: "The parent makes an ordinary tool call inside its own tool_calls loop: a single task passes goal (optionally with context); parallel batches pass tasks: [...]. The return value is JSON — in sync mode, a results array with one entry per task. Only this one tool result is appended to the parent's message stream; everything the child does stays out of the parent's context.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'delegate_task()',
      snippet: `def delegate_task(
    goal: Optional[str] = None,
    context: Optional[str] = None,
    tasks: Optional[List[Dict[str, Any]]] = None,
    max_iterations: Optional[int] = None,
    role: Optional[str] = None,
    background: Optional[bool] = None,
    parent_agent=None,
) -> str:
    """Spawn one or more child agents to handle delegated tasks.

      - Single: provide goal (+ optional context and role)
      - Batch:  provide tasks array [{goal, context, role}, ...]
    """`,
      note: 'parent_agent is injected by the framework; the model only fills goal / tasks / role / background',
    },
    events: [
      { name: 'pre_tool_call', desc: 'plugin hook audits the arguments' },
      { name: 'tool.execute', desc: 'registry dispatches to the delegate_task handler' },
    ],
    points: [
      'Single task: pass goal; parallel batch: pass tasks: [{goal, context, role}, ...]',
      'Per-task role overrides the top-level role (_normalize_role normalizes each one)',
      'The operator can pause new spawns via TUI /agents or the delegation.pause RPC',
    ],
  },
  {
    id: 'spawn',
    label: 'SPAWN',
    title: 'spawn child agents: isolated context + terminal session',
    body: "_build_child_agent constructs a brand-new AIAgent per task: an isolated conversation context (the parent's message stream is not shared) and an isolated terminal session. The child inherits the parent's toolsets, but only after a blacklist pass — a leaf role never gets delegate_task / clarify / memory / send_message / execute_code / cronjob. Dangerous-command approvals default to auto-deny in child threads (delegation.subagent_auto_approve defaults to false) and never block the parent's input UI.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'DELEGATE_BLOCKED_TOOLS',
      snippet: `# Tools that children must never have access to
DELEGATE_BLOCKED_TOOLS = frozenset(
    [
        "delegate_task",  # no recursive delegation
        "clarify",        # no user interaction
        "memory",         # no writes to shared MEMORY.md
        "send_message",   # no cross-platform side effects
        "execute_code",   # children should reason step-by-step
        "cronjob",        # no scheduling more work in the parent's name
    ]
)`,
      note: 'role="orchestrator" removes delegate_task from the blacklist; the rest stays banned',
    },
    events: [
      { name: 'child.build', desc: '_build_child_agent constructs the isolated AIAgent' },
      { name: 'toolset.strip', desc: '_strip_blocked_tools strips tools by role' },
    ],
    points: [
      "Isolated terminal session: the child's command execution environment is independent of the parent's",
      'Unknown role strings are normalized to leaf with a warning logged',
      'Children inherit parent toolsets; MCP toolsets are controlled by inherit_mcp_toolsets',
    ],
  },
  {
    id: 'loop',
    label: 'CHILD LOOP',
    title: 'the child runs its own tool_calls loop',
    body: "Each child agent is driven by _run_single_child in a thread pool, running the exact same main loop as Chapter 04: assemble messages → call the model → execute tools → append results. The iteration cap is shared with the parent's max_iterations (default 90). While running, children periodically propagate heartbeats to the parent, so the gateway's inactivity timeout won't kill a parent that is waiting on its children.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: '_run_single_child()',
      snippet: `def _run_single_child(
    task_index: int,
    goal: str,
    child=None,
    parent_agent=None,
    **_kwargs,
) -> Dict[str, Any]:
    """Run a pre-built child agent. Called from within a thread.
    Returns a structured result dict."""`,
      note: 'For batch tasks, N _run_single_child calls run concurrently in a thread pool',
    },
    events: [
      { name: 'child.turn', desc: "the child's own model calls and tool executions" },
      { name: 'heartbeat', desc: 'child activity heartbeats propagate to the parent' },
    ],
    points: [
      'max_iterations defaults to 90, shared between parent and child',
      'delegation.child_timeout_seconds backstops the whole child task',
      'Interrupt flags are registered per subagent_id, so interrupt_subagent can target a single child',
    ],
  },
  {
    id: 'return',
    label: 'RETURN',
    title: 'the child returns a summary',
    body: "When the child loop ends, only a structured summary (a tail excerpt of its output) is distilled — not dozens of intermediate messages dumped back into the parent. That is the point of context isolation: the parent's context window is not polluted by the child's intermediate work, and the prompt cache is untouched.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'AGENTS.md §Delegation',
      snippet: `# By default the parent waits for the child's summary
# before continuing its own loop.
#
# 子 agent 的中间消息不进 parent 的 context——
# parent 看到的只有这一条工具结果（summary）。`,
    },
    events: [
      {
        name: 'child.done',
        desc: 'the child wraps up; the output tail is extracted as the summary',
      },
    ],
    points: [
      'The summary is the only artifact that crosses the isolation boundary',
      'Failures and interrupts are also wrapped as structured results, which the parent can see and recover from',
      "Large outputs are reduced to a tail summary, protecting the parent's context window",
    ],
  },
  {
    id: 'aggregate',
    label: 'AGGREGATE',
    title: 'parent aggregates results and continues its own loop',
    body: "In sync mode the results array is appended to the parent's message stream as the tool result of delegate_task; on the next model call the parent reads every child's summary and reasons on from there — maybe spawning another round, summarizing for the user, or integrating the code the children produced. One delegation occupies just \"one call + one result\" in the parent's message stream.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: '同步返回路径',
      snippet: `# Returns JSON with results array, one entry per task.
#
# messages.append(tool_result_message(result))
# → parent 的循环继续，缓存前缀不变`,
    },
    events: [
      { name: 'message.append', desc: 'the results JSON is written back as a tool message' },
      { name: 'post_tool_call', desc: 'plugin hook: result post-processing' },
    ],
    points: [
      'The message stream is append-only — delegation does not break prompt caching',
      'The parent decides the next move: spawn more, summarize, or act directly',
      "Each child's cost is already counted into the parent's stats inside _run_single_child",
    ],
  },
];

export const DELEGATION_NOTES_EN: DelegationNote[] = [
  {
    id: 'background',
    kicker: 'Async delegation',
    title: 'background=true: return immediately, results via the completion queue',
    body: 'With background=true, delegate_task no longer blocks: the parent immediately gets a delegation_id and continues the conversation while the children run in the background. When all children finish, a completion event of type="async_delegation" is pushed into process_registry.completion_queue, and the existing drain logic in the CLI and gateway re-injects it into the session as a new message when the agent is idle. A batch is a single async unit: the aggregated result is pushed only once, after every child finishes. Note the persistence boundary: background delegation escapes the current turn but is still process-local — a process restart loses it. For work that must survive restarts, use cronjob or terminal(background=True, notify_on_complete=True).',
    code: {
      file: 'tools/async_delegation.py',
      snippet: `# 完成事件推进共享队列，复用 CLI + gateway 既有的 drain  wiring：
process_registry.completion_queue.put(evt)  # type="async_delegation"

# delegate_task 立即返回：
{ "status": "dispatched", "mode": "background",
  "delegation_id": dispatch["delegation_id"], ... }`,
      note: 'Async concurrency is likewise capped by max_concurrent_children to prevent runaway buildup',
    },
    points: [
      'The parent neither waits nor polls — it just keeps talking to the user',
      'Batch background tasks re-enter the session as a single aggregated completion event',
      'Persistence rule: work that must outlive a process restart goes to cronjob, not to background delegation',
    ],
  },
  {
    id: 'batch',
    kicker: 'Parallel fan-out',
    title: 'batch tasks:[]: one call, N children in parallel',
    body: 'Passing tasks: [{goal, ...}, ...] spawns multiple child agents running concurrently. Concurrency is capped by delegation.max_concurrent_children (default 3) — the same cap governs both sync batch parallelism and background queue size, so a runaway model cannot build an unbounded fan-out. Other knobs under delegation: in config.yaml: max_spawn_depth, child_timeout_seconds, orchestrator_enabled, subagent_auto_approve, inherit_mcp_toolsets, max_iterations.',
    code: {
      file: 'tools/delegate_tool.py',
      snippet: `_DEFAULT_MAX_CONCURRENT_CHILDREN = 3

# config.yaml
# delegation:
#   max_concurrent_children: 3   # 并发上限（同步批量 + 后台队列共用）
#   max_spawn_depth: 2           # 嵌套委派深度
#   child_timeout_seconds: ...   # 子任务整体超时`,
      note: 'Values above 10 log a one-time high-concurrency cost warning (every child burns API tokens)',
    },
    points: [
      'A batch returns one handle / one results array — the parent sees a single tool call',
      'Each child has its own context and its own terminal session',
      'Tasks beyond the concurrency cap queue up instead of being rejected',
    ],
  },
  {
    id: 'role',
    kicker: 'Role tiers',
    title: 'role=leaf vs role=orchestrator',
    body: 'leaf (the default) is a focused executor: the entire DELEGATE_BLOCKED_TOOLS set is disabled — it cannot spawn further, cannot ask the user, cannot write shared memory, cannot send cross-platform messages. orchestrator keeps delegate_task and can spawn its own workers into a nested tree — gated globally by delegation.orchestrator_enabled (default true), with nesting depth limited by delegation.max_spawn_depth (default 2: parent → child → grandchild, no further).',
    code: {
      file: 'tools/delegate_tool.py',
      snippet: `def _blocked_toolsets_for_role(role: str) -> List[str]:
    blocked_names = set(DELEGATE_BLOCKED_TOOLS)
    if role == "orchestrator":
        blocked_names.discard("delegate_task")  # 唯一解禁的工具
    ...`,
      note: "orchestrator's children are still leaf by default — depth converges naturally",
    },
    points: [
      'leaf bans: delegate_task / clarify / memory / send_message / execute_code / cronjob',
      'orchestrator only un-bans delegate_task; the rest of the blacklist stands',
      'max_spawn_depth defaults to 2, floor is 1, no hard upper cap (the cost is on you)',
    ],
  },
];

export const DELEGATION_HOOK_EN =
  'delegate_task = spawn an isolated AIAgent that runs the full main loop and stuffs only a ' +
  "summary back into the parent's message stream. Sync blocks for results; background=true goes " +
  'through the completion queue asynchronously; batch tasks:[] is capped at ' +
  'max_concurrent_children=3; leaf cannot spawn, orchestrator can but at depth ≤2.';

// 本章专属 UI 文案（组件硬编码部分）。
export const DELEGATION_UI = {
  deepKicker: { zh: '深入', en: 'Going deeper' },
  deepTitle: { zh: '异步、并行与角色分层', en: 'Async, parallel, and role tiers' },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住委派', en: 'Delegation in one line' },
};
