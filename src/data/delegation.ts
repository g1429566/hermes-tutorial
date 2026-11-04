// 第 12 章「委派系统」数据源：委派时序步进器 + background/batch/role 三小节。
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
  '父 agent 可以把相对独立的子目标交给子 agent。子 agent 获得自己的对话上下文与终端会话，运行工具循环，再交回结果和相关产物引用。下方展示内置委派的五个阶段；并行执行前，需要先确认任务依赖和共享文件范围。';

export const DELEGATION_STEPS: DelegationStep[] = [
  {
    id: 'call',
    label: 'DELEGATE',
    title: '父 agent 提交子任务',
    body: '模型提交子目标、必要上下文和预期产物。实际运行时决定异步交付或同步等待，嵌套、有限运行与其他后端可能不同。派发标识不是已完成结果。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '教学伪代码',
      snippet: 'submit tasks with explicit inputs and acceptance',
      note: '示意内置路径；其他后端可有不同执行方式。',
    },
    events: [
      {
        name: 'pre_tool_call',
        desc: '已注册插件可在执行前检查调用参数',
      },
      {
        name: 'tool.execute',
        desc: 'registry 分发到 delegate_task handler',
      },
    ],
    points: ['目标要包含输入、所需上下文和验收条件。', '派发标识只能证明已派发，不能证明已完成。'],
  },
  {
    id: 'spawn',
    label: 'SPAWN',
    title: '建立独立上下文与终端会话',
    body: '内置子 agent 有独立对话上下文和终端会话，工具与审批受配置及深度策略约束；仍可能共享文件系统，需要明确协调修改范围。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '教学伪代码',
      snippet: 'build child context and terminal session',
      note: '示意内置路径；其他后端可有不同执行方式。',
    },
    events: [
      {
        name: 'child.build',
        desc: '_build_child_agent 构造隔离的 AIAgent',
      },
      {
        name: 'toolset.strip',
        desc: '_strip_blocked_tools 按角色剥离工具',
      },
    ],
    points: ['子任务不会自动获得父对话的全部信息。', '独立上下文与终端会话不等于文件系统隔离。'],
  },
  {
    id: 'loop',
    label: 'CHILD LOOP',
    title: '子 agent 执行自己的循环',
    body: '内置批次可在有上限的线程池执行；各子任务运行自己的循环与限制。其他委派后端有各自支持的参数和边界。',
    code: {
      file: 'tools/delegate_tool_dispatch.py',
      lines: '教学伪代码',
      snippet: 'run eligible children within configured limits',
      note: '示意内置路径；其他后端可有不同执行方式。',
    },
    events: [
      {
        name: 'child.turn',
        desc: '子 agent 自己的模型调用与工具执行',
      },
      {
        name: 'heartbeat',
        desc: '子 agent 活动心跳传播给 parent',
      },
    ],
    points: [
      '子任务也会消耗模型请求、token 和工具预算。',
      '工具、嵌套深度和运行时支持限制可执行范围。',
    ],
  },
  {
    id: 'return',
    label: 'RETURN',
    title: '收回结果与产物引用',
    body: '父 agent 接收子任务结果和相关产物引用，中间轨迹不必全部进入父上下文。但共享文件和产物仍是其他交互通路，重要结论需要核对。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '教学伪代码',
      snippet: 'collect results and artifact references',
      note: '示意内置路径；其他后端可有不同执行方式。',
    },
    events: [
      {
        name: 'child.done',
        desc: '子任务收尾，最终回复收编成 summary（超长截头+尾）',
      },
    ],
    points: [
      '返回摘要后，关键结论仍需要来源与产物支持。',
      '共享文件有助于交付，也可能带来修改冲突。',
    ],
  },
  {
    id: 'aggregate',
    label: 'AGGREGATE',
    title: '父 agent 核验并整合结果',
    body: '完成结果通过当前运行时支持的路径交回。父 agent 整合产物、检查失败与文件冲突，再判断原始目标是否通过验收。',
    code: {
      file: 'tools/delegate_tool.py',
      lines: '教学伪代码',
      snippet: 'verify and integrate child outputs',
      note: '示意内置路径；其他后端可有不同执行方式。',
    },
    events: [
      {
        name: 'message.append',
        desc: 'results JSON 回写消息流（同步：tool 结果；异步：新消息回灌）',
      },
      {
        name: 'post_tool_call',
        desc: '插件钩子：结果后处理',
      },
    ],
    points: ['先检查各子任务是否成功，再合并相互一致的结果。', '最终验收仍以原用户目标为准。'],
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
    title: '按运行时交付完成结果',
    body: '支持的交互路径可先派发再交付完成事件；有限、嵌套、不支持或容量受限路径可能同步运行。进程内后台任务不会仅因后台执行就跨重启持久。',
    code: {
      file: 'tools/async_delegation.py',
      snippet:
        '# 完成事件推进共享队列，复用 CLI + gateway 既有的 drain  wiring：\nprocess_registry.completion_queue.put(evt)  # type="async_delegation"\n\n# delegate_task 立即返回：\n{ "status": "dispatched", "mode": "background",\n  "delegation_id": dispatch["delegation_id"], ... }',
      note: '异步派发同样受 max_concurrent_children 封顶：并发池满时新的派发退回同步内联执行，防止失控堆积',
    },
    points: ['检查实际后端与交付支持。', '跨重启任务需要持久化任务状态。'],
  },
  {
    id: 'rpc',
    kicker: 'RPC 脚本',
    title: '沙箱脚本怎样连续调用工具',
    body: '脚本可以在每步之间不回模型而调用支持的工具，减少中间模型往返。但执行、工具与结果仍有成本，认证、允许清单和预算仍需生效。',
    code: {
      file: 'tools/code_execution_rpc.py',
      snippet:
        '"""Host-side RPC servers for execute_code sandboxes.\n\nTwo transports share one request pipeline (token check → allow-list → call\nbudget → dispatch under output silence → log): _rpc_server_loop serves the\nlocal UDS/TCP socket, _rpc_poll_loop polls a remote filesystem for request\nfiles via env.execute().\n"""',
      note: '脚本在多步工具操作之间无需逐步返回模型；脚本本身仍需生成、执行并返回结果。',
    },
    points: [
      'RPC 表示远程过程调用：脚本把工具请求交给宿主端执行。',
      'token 校验身份，允许清单限制工具，调用预算限制实际派发次数。',
      '被拒绝的请求不消耗这里的派发次数预算，但不代表所有成本为零。',
    ],
  },
  {
    id: 'batch',
    kicker: '并行 fan-out',
    title: 'batch tasks:[]：一次调用，N 个子 agent 并行',
    body: '传 tasks: [{goal, ...}, ...] 一次派生多个子 agent 并发执行。delegation.max_concurrent_children（默认 10）同时封顶单次调用的任务数和异步派发并发度：一次调用给出超过上限的任务会被直接拒绝（报错提示拆分多次调用或调高上限），后台池满时新的派发退回同步内联执行，以限制后台派发的堆积。config.yaml 里 delegation: 下的其他旋钮：max_spawn_depth、child_timeout_seconds、orchestrator_enabled、subagent_auto_approve、inherit_mcp_toolsets、max_iterations、independent_completions、model / provider（为子 agent 指定模型或服务方）。',
    code: {
      file: 'tools/delegate_tool.py',
      snippet:
        '_DEFAULT_MAX_CONCURRENT_CHILDREN = 10\n\n# config.yaml\n# delegation:\n#   max_concurrent_children: 10  # 并发上限（批量任务数 + 后台派发共用）\n#   max_spawn_depth: 1           # 嵌套委派深度（1=扁平；≥2 才允许子 agent 再派生）\n#   child_timeout_seconds: ...   # 可选的"无进展"熔断（默认无超时）',
      note: '配置超过 10 会记一次性高并发成本警告（每个子 agent 都会产生模型输入输出成本）',
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
    body: 'role 参数如今是 legacy——仍接受但不再决定能力：运行时按嵌套深度推导 effective_role（orchestrator_enabled 为 true 且 child_depth < max_spawn_depth 即为 orchestrator，否则一律 leaf）。leaf 是专注的执行者：DELEGATE_BLOCKED_TOOLS 整组禁用，它不能再派生、不能问用户、不能写共享记忆、不能跨平台发消息、不能订 cron。orchestrator 保留 delegate_task，可以派生自己的 worker 组成嵌套树——由 delegation.orchestrator_enabled（默认 true）控制，嵌套深度受 delegation.max_spawn_depth 限制（默认 1：扁平一层 parent → child；调到 ≥2 才允许 child 升任 orchestrator 再派 grandchild）。',
    code: {
      file: 'tools/delegate_tool_toolsets.py',
      snippet:
        'def _blocked_toolsets_for_role(role: str) -> List[str]:\n    blocked_names = set(DELEGATE_BLOCKED_TOOLS)\n    if role == "orchestrator":\n        blocked_names.discard("delegate_task")  # 唯一解禁的工具\n    ...',
      note: 'depth 达到 max_spawn_depth 的子 agent自动是 leaf——深度天然收敛',
    },
    points: [
      'leaf 禁：delegate_task / clarify / memory / send_message / cronjob_manage（execute_code 已解禁）',
      'orchestrator 只解禁 delegate_task，其余黑名单照旧',
      'max_spawn_depth 默认 1（扁平），floor 为 1、无上限封顶（自行承担成本）',
    ],
  },
];

export const DELEGATION_HOOK =
  '委派交出明确子目标和上下文，收回结果再核验；派发、执行、交付、整合分别有条件，隔离边界也要分别说明。';

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const DELEGATION_INTRO_EN =
  'A parent can delegate relatively independent goals to children. Each child receives separate conversation context and a terminal session, runs its own tool loop, and returns results with relevant artifact references. Follow five stages of built-in delegation, checking task dependencies and shared files before parallel work.';

export const DELEGATION_STEPS_EN: DelegationStep[] = [
  {
    id: 'call',
    label: 'DELEGATE',
    title: 'parent calls delegate_task(goal)',
    body: 'The model submits tasks with goals, context, and expected outputs. Runtime capabilities determine asynchronous delivery or a synchronous wait; nested and finite paths can differ. A dispatch handle is not a completed result.',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'Teaching pseudocode',
      snippet: 'submit tasks with explicit inputs and acceptance',
      note: 'Built-in route illustration; other backends can differ.',
    },
    events: [
      {
        name: 'pre_tool_call',
        desc: 'registered plugins can inspect arguments before execution',
      },
      {
        name: 'tool.execute',
        desc: 'registry dispatches to the delegate_task handler',
      },
    ],
    points: [
      'Specify inputs, relevant context, and acceptance criteria.',
      'A dispatch handle confirms dispatch, not completion.',
    ],
  },
  {
    id: 'spawn',
    label: 'SPAWN',
    title: 'spawn child agents: isolated context + terminal session',
    body: 'Built-in children receive separate conversation context and terminal sessions. Tools and approvals are constrained by configuration and role/depth policy. They can share filesystem access, so coordinate edits explicitly.',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'Teaching pseudocode',
      snippet: 'build child context and terminal session',
      note: 'Built-in route illustration; other backends can differ.',
    },
    events: [
      {
        name: 'child.build',
        desc: '_build_child_agent constructs the isolated AIAgent',
      },
      {
        name: 'toolset.strip',
        desc: '_strip_blocked_tools strips tools by role',
      },
    ],
    points: [
      'Children do not automatically receive the full parent conversation.',
      'Separate contexts and terminals do not imply filesystem isolation.',
    ],
  },
  {
    id: 'loop',
    label: 'CHILD LOOP',
    title: 'the child runs its own tool_calls loop',
    body: 'Built-in batches may execute in a bounded thread pool. Each child follows its own loop and configured limits. Other delegation backends have their own supported parameters and boundaries.',
    code: {
      file: 'tools/delegate_tool_dispatch.py',
      lines: 'Teaching pseudocode',
      snippet: 'run eligible children within configured limits',
      note: 'Built-in route illustration; other backends can differ.',
    },
    events: [
      {
        name: 'child.turn',
        desc: "the child's own model calls and tool executions",
      },
      {
        name: 'heartbeat',
        desc: 'child activity heartbeats propagate to the parent',
      },
    ],
    points: [
      'Children consume model requests, tokens, and tool budgets.',
      'Tools, depth policy, and runtime support constrain execution.',
    ],
  },
  {
    id: 'return',
    label: 'RETURN',
    title: 'the child returns a summary',
    body: 'The parent receives child results and relevant artifact references. Intermediate trajectories need not all enter parent context, but artifacts and shared files can cross other boundaries. Verify important evidence.',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'Teaching pseudocode',
      snippet: 'collect results and artifact references',
      note: 'Built-in route illustration; other backends can differ.',
    },
    events: [
      {
        name: 'child.done',
        desc: 'the child wraps up; its final response becomes the summary (over-long: head+tail)',
      },
    ],
    points: [
      'Summaries still need evidence and artifact references.',
      'Shared files support delivery but can cause edit conflicts.',
    ],
  },
  {
    id: 'aggregate',
    label: 'AGGREGATE',
    title: 'parent aggregates results and continues its own loop',
    body: 'Completion delivery depends on runtime support. The parent integrates outputs, checks failures and file conflicts, and decides whether the original goal has passed acceptance.',
    code: {
      file: 'tools/delegate_tool.py',
      lines: 'Teaching pseudocode',
      snippet: 'verify and integrate child outputs',
      note: 'Built-in route illustration; other backends can differ.',
    },
    events: [
      {
        name: 'message.append',
        desc: 'results JSON written back (sync: tool result; async: re-injected message)',
      },
      {
        name: 'post_tool_call',
        desc: 'plugin hook: result post-processing',
      },
    ],
    points: [
      'Check child success and reconcile results before integration.',
      'Acceptance still follows the original user goal.',
    ],
  },
];

export const DELEGATION_NOTES_EN: DelegationNote[] = [
  {
    id: 'background',
    kicker: 'Async delegation',
    title: 'Runtime-dependent completion delivery',
    body: 'Supported interactive routes can dispatch and deliver later. Finite, nested, unsupported, or capacity-limited paths can use synchronous execution. Detached in-process work does not become restart-durable merely because it is background.',
    code: {
      file: 'tools/async_delegation.py',
      snippet:
        '# 完成事件推进共享队列，复用 CLI + gateway 既有的 drain  wiring：\nprocess_registry.completion_queue.put(evt)  # type="async_delegation"\n\n# delegate_task 立即返回：\n{ "status": "dispatched", "mode": "background",\n  "delegation_id": dispatch["delegation_id"], ... }',
      note: 'Async dispatches are likewise capped by max_concurrent_children: when the pool is full a new dispatch falls back to running synchronously inline, preventing runaway buildup',
    },
    points: [
      'Check the actual backend and delivery support.',
      'Use persistent job state when restart durability is required.',
    ],
  },
  {
    id: 'rpc',
    kicker: 'RPC scripts',
    title:
      'tools/code_execution_rpc.py: sandbox scripts calling tools directly, fewer intermediate model round trips',
    body: 'A script can call supported tools without a model round trip between every operation. This reduces intermediate model traffic, but execution, tool, and result costs remain. Authentication, allowlists, and budgets still apply.',
    code: {
      file: 'tools/code_execution_rpc.py',
      snippet:
        '"""Host-side RPC servers for execute_code sandboxes.\n\nTwo transports share one request pipeline (token check → allow-list → call\nbudget → dispatch under output silence → log): _rpc_server_loop serves the\nlocal UDS/TCP socket, _rpc_poll_loop polls a remote filesystem for request\nfiles via env.execute().\n"""',
      note: 'No model round trip between script operations; script generation, execution, and returned results still have costs.',
    },
    points: [
      'RPC sends a procedure call from the sandbox script to the host.',
      'A token, allowlist, and call budget constrain dispatch.',
      'Rejected requests do not consume this dispatch budget; that does not imply zero total cost.',
    ],
  },
  {
    id: 'batch',
    kicker: 'Parallel fan-out',
    title: 'batch tasks:[]: one call, N children in parallel',
    body: 'Passing tasks: [{goal, ...}, ...] spawns multiple child agents running concurrently. delegation.max_concurrent_children (default 10) caps both the task count of a single call and async dispatch concurrency: a call with more tasks than the cap is rejected outright (with an error suggesting multiple calls or a higher limit), and when the background pool is full a new dispatch falls back to running synchronously inline — a runaway model cannot build an unbounded fan-out. Other knobs under delegation: in config.yaml: max_spawn_depth, child_timeout_seconds, orchestrator_enabled, subagent_auto_approve, inherit_mcp_toolsets, max_iterations, independent_completions, model / provider (pin a different model or provider for children).',
    code: {
      file: 'tools/delegate_tool.py',
      snippet:
        '_DEFAULT_MAX_CONCURRENT_CHILDREN = 10\n\n# config.yaml\n# delegation:\n#   max_concurrent_children: 10  # 并发上限（批量任务数 + 后台派发共用）\n#   max_spawn_depth: 1           # 嵌套委派深度（1=扁平；≥2 才允许孩子再派生）\n#   child_timeout_seconds: ...   # 可选的"无进展"熔断（默认无超时）',
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
      snippet:
        'def _blocked_toolsets_for_role(role: str) -> List[str]:\n    blocked_names = set(DELEGATE_BLOCKED_TOOLS)\n    if role == "orchestrator":\n        blocked_names.discard("delegate_task")  # 唯一解禁的工具\n    ...',
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
  'Delegate explicit goals and context, then verify returned work. Dispatch, execution, delivery, integration, and isolation have distinct conditions.';

// 本章专属 UI 文案（组件硬编码部分）。
export const DELEGATION_UI = {
  deepKicker: { zh: '深入', en: 'Going deeper' },
  deepTitle: { zh: '异步、并行与角色分层', en: 'Async, parallel, and role tiers' },
  hookKicker: { zh: '要点回顾', en: 'Key idea' },
  hookTitle: { zh: '一句话记住委派', en: 'Delegation in one line' },
};
