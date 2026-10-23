// Chapter 09「委派系统」数据源：委派时序步进器 + background/batch/role 三小节。
// 内容对齐 hermes-agent/tools/AGENTS.md 的「Delegation (delegate_task)」一节，
// 代码片段摘自 tools/delegate_tool*.py 与 tools/async_delegation.py（手动摘录）。

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
    body: 'parent 在自己的 tool_calls 循环里发起一次普通工具调用：标准形态是传 tasks: [...]（单任务就是一条数组；旧的顶层 goal 形态仍兼容，仅服务旧会话）。在有后续轮次的会话里调用总是异步派发——返回值是 JSON dispatch handle（status: "dispatched" + delegation_id + 每个任务的 live transcript 路径），results 等孩子跑完再回灌；一次性会话（-Q/--oneshot、非 TTY stdio、cron 任务、kanban worker、无状态 HTTP）则在调用内同步 join，返回每个任务一条的 results 数组。无论哪条路，子 agent 的全过程都不进 parent 的 context。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'delegate_task()',
      snippet: `def delegate_task(
    goal=None, context=None, tasks=None,      # tasks:[...] 是标准形态，单任务=一条数组
    action=None, subagent_id=None, message=None,  # 运行中孩子的 list / steer / stop 控制
    background=None, role=None,               # 均已废弃：顶层总是异步派发；能力按深度推导
    output_schema=None, images=None,
    parent_agent=None,                        # 框架注入
) -> str:
    """Spawn child agents (single 'goal' or tasks=[...] batch)
    or control running ones ('action' = list/steer/stop).

    Returns JSON with one results entry per task, or a dispatch
    handle when running in the background.""`,
      note: 'parent_agent 由框架注入；模型主要填 tasks（+ action/subagent_id/message 做运行中控制）；role / background 已废弃',
    },
    events: [
      { name: 'pre_tool_call', desc: '插件钩子审计参数' },
      { name: 'tool.execute', desc: 'registry 分发到 delegate_task handler' },
    ],
    points: [
      '标准形态是 tasks: [{goal, context, output_schema, ...}, ...]，单任务就是一条数组；顶层 goal 仅为兼容旧会话保留',
      'role 参数已 legacy（仍接受但忽略）：委派能力由嵌套深度推导，_normalize_role 只把未知值归一为 leaf',
      'operator 可通过 TUI /agents 或 delegation.pause RPC 暂停新的派生',
    ],
  },
  {
    id: 'spawn',
    label: 'SPAWN',
    title: 'spawn 子 agent：隔离 context + terminal session',
    body: '_build_child_agent 为每个任务构造一个全新的 AIAgent：隔离的对话 context（不共享 parent 的消息流）、隔离的 terminal session。子 agent 继承 parent 的 toolsets，但先过一遍黑名单剥离——leaf 角色永远拿不到 delegate_task / clarify / memory / send_message / cronjob_manage（execute_code 已解禁）。危险命令审批在子线程里默认 auto-deny（delegation.subagent_auto_approve 默认 false），绝不阻塞 parent 的输入界面。',
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
        "cronjob_manage", # no scheduling more work in the parent's name
    ]
)`,
      note: '深度未达 max_spawn_depth 的子 agent 会被推导为 orchestrator：delegation toolset 重新加回，其余照禁',
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
    body: '每个子 agent 在线程池里由 _run_single_child 驱动，跑和第 04 章完全相同的主循环：组装消息 → 调模型 → 执行工具 → 追加结果。迭代上限和 parent 读同一个 delegation.max_iterations（默认 250；调用传入的 max_iterations 会被忽略）。运行期间子 agent 定期向 parent 传播心跳，网关的 inactivity 超时不会误杀正在等孩子的 parent。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '_run_single_child()',
      snippet: `def _run_single_child(
    task_index: int,
    goal: str,
    child=None,
    parent_agent=None,
    *,
    owner_session_id=None,
    owner_transport=None,
    owner_session_record=None,
    **_kwargs,
) -> Dict[str, Any]:
    """Run a pre-built child agent (called from a worker thread)
    and return its result entry."""`,
      note: '批量任务时 N 个 _run_single_child 并发跑在线程池里',
    },
    events: [
      { name: 'child.turn', desc: '子 agent 自己的模型调用与工具执行' },
      { name: 'heartbeat', desc: '子 agent 活动心跳传播给 parent' },
    ],
    points: [
      'max_iterations 默认 250，由 delegation.max_iterations 决定（调用传入值被忽略）',
      'delegation.child_timeout_seconds 是可选兜底：默认无超时，设置后按"无进展秒数"熔断（下限 30s）',
      '中断标志按 subagent_id 注册，可单独 interrupt_subagent',
    ],
  },
  {
    id: 'return',
    label: 'RETURN',
    title: '子 agent 返回 summary',
    body: '子 agent 循环结束后，只把它的最终回复提炼成一份结构化 summary（超预算时截成头+尾两段、中段留溢出文件指针），而不是把几十轮中间消息倒回 parent。这就是 context 隔离的意义：parent 的上下文窗口不被子任务的中间过程污染，prompt cache 也不受影响。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'tools/AGENTS.md §Delegation',
      snippet: `# By default the parent waits for the child's summary
# before continuing its own loop.
#
# 子 agent 的中间消息不进 parent 的 context——
# parent 看到的只有这一条工具结果（summary）。`,
    },
    events: [{ name: 'child.done', desc: '子任务收尾，最终回复收编成 summary（超长截头+尾）' }],
    points: [
      'summary 是唯一穿越隔离边界的产物',
      '失败/中断也被包装成结构化结果，parent 能看到并自我修复',
      '超长 summary 截成头+尾并附溢出文件指针，保护 parent 的上下文窗口',
    ],
  },
  {
    id: 'aggregate',
    label: 'AGGREGATE',
    title: 'parent 聚合结果，继续自己的循环',
    body: 'results 数组的归宿取决于会话：一次性会话里它作为 delegate_task 的工具结果追加进 parent 的消息流；交互式会话里它由 drain 逻辑在 agent 空闲时作为一条新消息回灌。parent 在下一次模型调用中读到所有子任务的 summary，据此继续推理——可能再派一轮、汇总给用户、或动手整合子任务产出的代码。一次委派本身只在 parent 的消息流里占「一次调用 + 一条结果」。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '同步返回路径',
      snippet: `# Returns JSON with results array, one entry per task.
#
# messages.append(make_tool_result_message(name, result, tool_call_id))
# → parent 的循环继续，缓存前缀不变`,
    },
    events: [
      {
        name: 'message.append',
        desc: 'results JSON 回写消息流（同步：tool 结果；异步：新消息回灌）',
      },
      { name: 'post_tool_call', desc: '插件钩子：结果后处理' },
    ],
    points: [
      '消息流只 append——委派不破坏 prompt caching',
      'parent 决定下一步：继续派生、汇总、或直接行动',
      '子 agent 的花费由结果聚合器折进 parent 的会话成本',
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
    title: '顶层委派总是异步：立即返回，结果走完成队列',
    body: '现在模型侧的顶层委派总是异步派发（background 参数已废弃、被忽略）：parent 立刻拿到一个 delegation_id 和每个任务的 live transcript 路径，继续当前对话，子任务在后台执行。全部子任务完成后，一个 type="async_delegation" 的完成事件被推进 process_registry.completion_queue，CLI 与网关既有的 drain 逻辑在 agent 空闲时把它作为一条新消息重新注入会话。批量任务默认作为一个异步单元：等所有孩子结束后只推送一次聚合结果；设 delegation.independent_completions: true 可按 group（或未分组的单任务）拆成多个完成单元，谁先完成谁先回灌。注意持久性边界：background 委派脱离了当前轮次，但仍是进程本地的——进程重启就丢了。需要跨重启存活的工作，用 cronjob 或 terminal(background=True, notify_on_complete=True)。',
    code: {
      file: 'tools/async_delegation.py',
      snippet: `# 完成事件推进共享队列，复用 CLI + gateway 既有的 drain  wiring：
process_registry.completion_queue.put(evt)  # type="async_delegation"

# delegate_task 立即返回：
{ "status": "dispatched", "mode": "background",
  "delegation_id": dispatch["delegation_id"], ... }`,
      note: '异步派发同样受 max_concurrent_children 封顶：并发池满时新的派发退回同步内联执行，防止失控堆积',
    },
    points: [
      'parent 不等、不轮询——继续和用户对话即可',
      '批量后台任务默认聚合为单个完成事件重新进入会话（independent_completions 可拆分）',
      '持久性规则：跨进程重启的活儿交给 cronjob，不要交给 background 委派',
    ],
  },
  {
    id: 'rpc',
    kicker: 'RPC 脚本',
    title: 'tools/code_execution_rpc.py：沙箱脚本直调工具的零上下文回合',
    body: '委派并行之外还有第二条「省上下文」路径：execute_code 沙箱里的 Python 脚本可以不回模型、直接调工具。tools/code_execution_rpc.py 在宿主侧起 RPC server——本地走 UDS/TCP socket（_rpc_server_loop），远程环境轮询请求文件（_rpc_poll_loop），两条传输共享同一条流水线：token 校验（常量时间比较，空 token fail closed）→ allow-list → call budget → 静默分发 → 记日志。只有真正 dispatch 的调用才消耗预算，拒绝是免费的。多步流水线由此压成不花模型 round-trip 的「零上下文成本回合」——模型只在首尾出场，中间步骤全在沙箱脚本里完成。',
    code: {
      file: 'tools/code_execution_rpc.py',
      snippet: `"""Host-side RPC servers for execute_code sandboxes.

Two transports share one request pipeline (token check → allow-list → call
budget → dispatch under output silence → log): _rpc_server_loop serves the
local UDS/TCP socket, _rpc_poll_loop polls a remote filesystem for request
files via env.execute().
"""`,
      note: '沙箱脚本 = 不花模型 round-trip 的多步流水线；与委派并行互补的第二种省上下文路径',
    },
    points: [
      '脚本直调工具，多步流水线零模型 round-trip',
      'token 校验 → allow-list → call budget → dispatch：同一条流水线两种传输共用',
      '只有 dispatch 消耗 call budget，refusals are free',
    ],
  },
  {
    id: 'batch',
    kicker: '并行 fan-out',
    title: 'batch tasks:[]：一次调用，N 个子 agent 并行',
    body: '传 tasks: [{goal, ...}, ...] 一次派生多个子 agent 并发执行。delegation.max_concurrent_children（默认 10）同时封顶单次调用的任务数和异步派发并发度：一次调用给出超过上限的任务会被直接拒绝（报错提示拆分多次调用或调高上限），后台池满时新的派发退回同步内联执行，失控的模型没法堆出无界 fan-out。config.yaml 里 delegation: 下的其他旋钮：max_spawn_depth、child_timeout_seconds、orchestrator_enabled、subagent_auto_approve、inherit_mcp_toolsets、max_iterations、independent_completions、model / provider（给孩子换模型或供应商）。',
    code: {
      file: 'tools/delegate_tool.py',
      snippet: `_DEFAULT_MAX_CONCURRENT_CHILDREN = 10

# config.yaml
# delegation:
#   max_concurrent_children: 10  # 并发上限（批量任务数 + 后台派发共用）
#   max_spawn_depth: 1           # 嵌套委派深度（1=扁平；≥2 才允许孩子再派生）
#   child_timeout_seconds: ...   # 可选的"无进展"熔断（默认无超时）`,
      note: '配置超过 10 会记一次性高并发成本警告（每个子 agent 都烧 API tokens）',
    },
    points: [
      '批量返回一个 handle / 一个 results 数组——parent 只看到一次工具调用',
      '每个子 agent 独立 context、独立 terminal session',
      '一次调用超过任务上限会被拒绝并提示拆分；后台池满则退回同步执行',
    ],
  },
  {
    id: 'role',
    kicker: '角色分层',
    title: 'leaf 与 orchestrator：由深度推导的角色分层',
    body: 'role 参数如今是 legacy——仍接受但不再决定能力：运行时按嵌套深度推导 effective_role（orchestrator_enabled 为 true 且 child_depth < max_spawn_depth 即为 orchestrator，否则一律 leaf）。leaf 是专注的执行者：DELEGATE_BLOCKED_TOOLS 整组禁用，它不能再派生、不能问用户、不能写共享记忆、不能跨平台发消息、不能订 cron。orchestrator 保留 delegate_task，可以派生自己的 worker 组成嵌套树——由 delegation.orchestrator_enabled（默认 true）总控，嵌套深度受 delegation.max_spawn_depth 限制（默认 1：扁平一层 parent → child；调到 ≥2 才允许 child 升任 orchestrator 再派 grandchild）。',
    code: {
      file: 'tools/delegate_tool_toolsets.py',
      snippet: `def _blocked_toolsets_for_role(role: str) -> List[str]:
    blocked_names = set(DELEGATE_BLOCKED_TOOLS)
    if role == "orchestrator":
        blocked_names.discard("delegate_task")  # 唯一解禁的工具
    ...`,
      note: 'depth 达到 max_spawn_depth 的孩子自动是 leaf——深度天然收敛',
    },
    points: [
      'leaf 禁：delegate_task / clarify / memory / send_message / cronjob_manage（execute_code 已解禁）',
      'orchestrator 只解禁 delegate_task，其余黑名单照旧',
      'max_spawn_depth 默认 1（扁平），floor 为 1、无上限封顶（自行承担成本）',
    ],
  },
];

export const DELEGATION_HOOK =
  'delegate_task = spawn 一个隔离的 AIAgent 跑完整主循环，只把 summary 塞回 parent 的消息流。' +
  '模型侧顶层委派总是异步：结果经 completion queue 作为新消息回灌（一次性会话才在调用内同步等待）；' +
  '批量 tasks:[] 受 max_concurrent_children=10 封顶；leaf 不能再派生，orchestrator 由深度推导、' +
  '受 max_spawn_depth 约束（默认 1，调大可嵌套）。';

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
    body: 'The parent makes an ordinary tool call inside its own tool_calls loop: the advertised shape is tasks: [...] (a single task is a one-entry array; the legacy top-level goal form is still accepted for old transcripts). In sessions with a later turn, the call is always dispatched asynchronously — the return value is a JSON dispatch handle (status: "dispatched" + delegation_id + a live transcript path per task), and the results re-enter once the children finish. Finite sessions (-Q/--oneshot, non-TTY stdio, cron jobs, kanban workers, stateless HTTP) join inside the call instead, getting a results array with one entry per task. Either way, everything the child does stays out of the parent\'s context.',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'delegate_task()',
      snippet: `def delegate_task(
    goal=None, context=None, tasks=None,      # tasks:[...] is the advertised shape; one task = a one-entry array
    action=None, subagent_id=None, message=None,  # live control of running children: list / steer / stop
    background=None, role=None,               # both deprecated: top-level is always async; capability is depth-derived
    output_schema=None, images=None,
    parent_agent=None,                        # injected by the framework
) -> str:
    """Spawn child agents (single 'goal' or tasks=[...] batch)
    or control running ones ('action' = list/steer/stop).

    Returns JSON with one results entry per task, or a dispatch
    handle when running in the background.""`,
      note: 'parent_agent is injected by the framework; the model mostly fills tasks (+ action/subagent_id/message for live control); role / background are deprecated',
    },
    events: [
      { name: 'pre_tool_call', desc: 'plugin hook audits the arguments' },
      { name: 'tool.execute', desc: 'registry dispatches to the delegate_task handler' },
    ],
    points: [
      'The advertised shape is tasks: [{goal, context, output_schema, ...}, ...] — a single task is a one-entry array; the top-level goal form is kept only for old transcripts',
      'The role parameter is legacy (accepted but ignored): delegation capability is derived from nesting depth; _normalize_role just coerces unknown values to leaf',
      'The operator can pause new spawns via TUI /agents or the delegation.pause RPC',
    ],
  },
  {
    id: 'spawn',
    label: 'SPAWN',
    title: 'spawn child agents: isolated context + terminal session',
    body: "_build_child_agent constructs a brand-new AIAgent per task: an isolated conversation context (the parent's message stream is not shared) and an isolated terminal session. The child inherits the parent's toolsets, but only after a blacklist pass — a leaf role never gets delegate_task / clarify / memory / send_message / cronjob_manage (execute_code was un-blocked). Dangerous-command approvals default to auto-deny in child threads (delegation.subagent_auto_approve defaults to false) and never block the parent's input UI.",
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
        "cronjob_manage", # no scheduling more work in the parent's name
    ]
)`,
      note: 'a child whose depth is below max_spawn_depth is derived as orchestrator: the delegation toolset is re-added; the rest stays banned',
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
    body: "Each child agent is driven by _run_single_child in a thread pool, running the exact same main loop as Chapter 04: assemble messages → call the model → execute tools → append results. The iteration cap reads the same delegation.max_iterations as the parent (default 250; a caller-supplied max_iterations is ignored). While running, children periodically propagate heartbeats to the parent, so the gateway's inactivity timeout won't kill a parent that is waiting on its children.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: '_run_single_child()',
      snippet: `def _run_single_child(
    task_index: int,
    goal: str,
    child=None,
    parent_agent=None,
    *,
    owner_session_id=None,
    owner_transport=None,
    owner_session_record=None,
    **_kwargs,
) -> Dict[str, Any]:
    """Run a pre-built child agent (called from a worker thread)
    and return its result entry."""`,
      note: 'For batch tasks, N _run_single_child calls run concurrently in a thread pool',
    },
    events: [
      { name: 'child.turn', desc: "the child's own model calls and tool executions" },
      { name: 'heartbeat', desc: 'child activity heartbeats propagate to the parent' },
    ],
    points: [
      'max_iterations defaults to 250, governed by delegation.max_iterations (a caller-supplied value is ignored)',
      'delegation.child_timeout_seconds is an opt-in backstop: no timeout by default; once set, it trips on seconds of NO progress (30s floor)',
      'Interrupt flags are registered per subagent_id, so interrupt_subagent can target a single child',
    ],
  },
  {
    id: 'return',
    label: 'RETURN',
    title: 'the child returns a summary',
    body: "When the child loop ends, only its final response is distilled into a structured summary (over-budget text is trimmed to a head+tail pair with a pointer to the spilled middle on disk) — not dozens of intermediate messages dumped back into the parent. That is the point of context isolation: the parent's context window is not polluted by the child's intermediate work, and the prompt cache is untouched.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'tools/AGENTS.md §Delegation',
      snippet: `# By default the parent waits for the child's summary
# before continuing its own loop.
#
# 子 agent 的中间消息不进 parent 的 context——
# parent 看到的只有这一条工具结果（summary）。`,
    },
    events: [
      {
        name: 'child.done',
        desc: 'the child wraps up; its final response becomes the summary (over-long: head+tail)',
      },
    ],
    points: [
      'The summary is the only artifact that crosses the isolation boundary',
      'Failures and interrupts are also wrapped as structured results, which the parent can see and recover from',
      "Over-long summaries are trimmed to head+tail with a spill-file pointer, protecting the parent's context window",
    ],
  },
  {
    id: 'aggregate',
    label: 'AGGREGATE',
    title: 'parent aggregates results and continues its own loop',
    body: "Where the results array lands depends on the session: in a finite session it is appended to the parent's message stream as the tool result of delegate_task; in an interactive session the existing drain logic re-injects it as a new message once the agent is idle. On the next model call the parent reads every child's summary and reasons on from there — maybe spawning another round, summarizing for the user, or integrating the code the children produced. The delegation itself occupies just \"one call + one result\" in the parent's message stream.",
    code: {
      file: 'tools/delegate_tool.py',
      lines: '同步返回路径',
      snippet: `# Returns JSON with results array, one entry per task.
#
# messages.append(make_tool_result_message(name, result, tool_call_id))
# → parent 的循环继续，缓存前缀不变`,
    },
    events: [
      {
        name: 'message.append',
        desc: 'results JSON written back (sync: tool result; async: re-injected message)',
      },
      { name: 'post_tool_call', desc: 'plugin hook: result post-processing' },
    ],
    points: [
      'The message stream is append-only — delegation does not break prompt caching',
      'The parent decides the next move: spawn more, summarize, or act directly',
      "Each child's spend is folded into the parent's session cost by the result aggregator",
    ],
  },
];

export const DELEGATION_NOTES_EN: DelegationNote[] = [
  {
    id: 'background',
    kicker: 'Async delegation',
    title: 'always async: return immediately, results via the completion queue',
    body: 'Model-facing top-level delegations are now always dispatched asynchronously (the background parameter is deprecated and ignored): the parent immediately gets a delegation_id plus a live transcript path per task and continues the conversation while the children run in the background. When all children finish, a completion event of type="async_delegation" is pushed into process_registry.completion_queue, and the existing drain logic in the CLI and gateway re-injects it into the session as a new message when the agent is idle. A batch is ONE async unit by default: the aggregated result is pushed only once, after every child finishes; set delegation.independent_completions: true to split it into completion units per group (or per ungrouped task), each re-entering as it finishes. Note the persistence boundary: background delegation escapes the current turn but is still process-local — a process restart loses it. For work that must survive restarts, use cronjob or terminal(background=True, notify_on_complete=True).',
    code: {
      file: 'tools/async_delegation.py',
      snippet: `# 完成事件推进共享队列，复用 CLI + gateway 既有的 drain  wiring：
process_registry.completion_queue.put(evt)  # type="async_delegation"

# delegate_task 立即返回：
{ "status": "dispatched", "mode": "background",
  "delegation_id": dispatch["delegation_id"], ... }`,
      note: 'Async dispatches are likewise capped by max_concurrent_children: when the pool is full a new dispatch falls back to running synchronously inline, preventing runaway buildup',
    },
    points: [
      'The parent neither waits nor polls — it just keeps talking to the user',
      'Batch background tasks re-enter the session as one aggregated completion event by default (independent_completions can split them)',
      'Persistence rule: work that must outlive a process restart goes to cronjob, not to background delegation',
    ],
  },
  {
    id: 'rpc',
    kicker: 'RPC scripts',
    title:
      'tools/code_execution_rpc.py: sandbox scripts calling tools directly, a zero-context turn',
    body: 'Besides delegation parallelism there is a second "context-saving" path: a Python script inside an execute_code sandbox can call tools directly without going back to the model. tools/code_execution_rpc.py runs a host-side RPC server — locally over a UDS/TCP socket (_rpc_server_loop), on remote environments by polling request files (_rpc_poll_loop) — and both transports share one request pipeline: token check (constant-time compare, empty token fails closed) → allow-list → call budget → dispatch under output silence → log. Only a dispatched call consumes budget; refusals are free. A multi-step pipeline is compressed into a "zero-context-cost turn" that spends no model round-trips — the model only shows up at the first and last step, with everything in between executed inside the sandbox script.',
    code: {
      file: 'tools/code_execution_rpc.py',
      snippet: `"""Host-side RPC servers for execute_code sandboxes.

Two transports share one request pipeline (token check → allow-list → call
budget → dispatch under output silence → log): _rpc_server_loop serves the
local UDS/TCP socket, _rpc_poll_loop polls a remote filesystem for request
files via env.execute().
"""`,
      note: 'Sandbox script = a multi-step pipeline with zero model round-trips; the second context-saving path, complementing delegation parallelism',
    },
    points: [
      'Scripts call tools directly: multi-step pipelines with zero model round-trips',
      'token check → allow-list → call budget → dispatch: one pipeline shared by both transports',
      'Only dispatches consume the call budget — refusals are free',
    ],
  },
  {
    id: 'batch',
    kicker: 'Parallel fan-out',
    title: 'batch tasks:[]: one call, N children in parallel',
    body: 'Passing tasks: [{goal, ...}, ...] spawns multiple child agents running concurrently. delegation.max_concurrent_children (default 10) caps both the task count of a single call and async dispatch concurrency: a call with more tasks than the cap is rejected outright (with an error suggesting multiple calls or a higher limit), and when the background pool is full a new dispatch falls back to running synchronously inline — a runaway model cannot build an unbounded fan-out. Other knobs under delegation: in config.yaml: max_spawn_depth, child_timeout_seconds, orchestrator_enabled, subagent_auto_approve, inherit_mcp_toolsets, max_iterations, independent_completions, model / provider (pin a different model or provider for children).',
    code: {
      file: 'tools/delegate_tool.py',
      snippet: `_DEFAULT_MAX_CONCURRENT_CHILDREN = 10

# config.yaml
# delegation:
#   max_concurrent_children: 10  # 并发上限（批量任务数 + 后台派发共用）
#   max_spawn_depth: 1           # 嵌套委派深度（1=扁平；≥2 才允许孩子再派生）
#   child_timeout_seconds: ...   # 可选的"无进展"熔断（默认无超时）`,
      note: 'Values above 10 log a one-time high-concurrency cost warning (every child burns API tokens)',
    },
    points: [
      'A batch returns one handle / one results array — the parent sees a single tool call',
      'Each child has its own context and its own terminal session',
      'A call with more tasks than the cap is rejected with a hint to split; a full background pool falls back to sync inline execution',
    ],
  },
  {
    id: 'role',
    kicker: 'Role tiers',
    title: 'leaf vs orchestrator: role tiers derived from depth',
    body: 'The role parameter is now legacy — still accepted but no longer decisive: the runtime derives effective_role from nesting depth (orchestrator when orchestrator_enabled is true and child_depth < max_spawn_depth, leaf otherwise). leaf is a focused executor: the entire DELEGATE_BLOCKED_TOOLS set is disabled — it cannot spawn further, cannot ask the user, cannot write shared memory, cannot send cross-platform messages, cannot schedule cron jobs. orchestrator keeps delegate_task and can spawn its own workers into a nested tree — gated globally by delegation.orchestrator_enabled (default true), with nesting depth limited by delegation.max_spawn_depth (default 1: flat, parent → child; raise it to ≥2 to let a child act as an orchestrator and spawn grandchildren).',
    code: {
      file: 'tools/delegate_tool_toolsets.py',
      snippet: `def _blocked_toolsets_for_role(role: str) -> List[str]:
    blocked_names = set(DELEGATE_BLOCKED_TOOLS)
    if role == "orchestrator":
        blocked_names.discard("delegate_task")  # 唯一解禁的工具
    ...`,
      note: 'a child at max_spawn_depth is automatically leaf — depth converges naturally',
    },
    points: [
      'leaf bans: delegate_task / clarify / memory / send_message / cronjob_manage (execute_code was un-blocked)',
      'orchestrator only un-bans delegate_task; the rest of the blacklist stands',
      'max_spawn_depth defaults to 1 (flat), floor is 1, no hard upper cap (the cost is on you)',
    ],
  },
];

export const DELEGATION_HOOK_EN =
  'delegate_task = spawn an isolated AIAgent that runs the full main loop and stuffs only a ' +
  "summary back into the parent's message stream. Model-facing top-level delegations are always " +
  'async: results re-enter through the completion queue as a new message (only finite sessions ' +
  'join inside the call); batch tasks:[] is capped at max_concurrent_children=10; leaf cannot ' +
  'spawn, orchestrator is depth-derived and bounded by max_spawn_depth (default 1; raise it to nest).';

// 本章专属 UI 文案（组件硬编码部分）。
export const DELEGATION_UI = {
  deepKicker: { zh: '深入', en: 'Going deeper' },
  deepTitle: { zh: '异步、并行与角色分层', en: 'Async, parallel, and role tiers' },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住委派', en: 'Delegation in one line' },
};
