// Chapter 04「Agent 主循环」数据源：六步步进器。
// 内容对齐 hermes-agent/agent/AGENTS.md 的「Shape」与「Agent loop」一节，
// 代码片段摘自 agent/conversation_loop.py 的真实循环结构（手动摘录，阶段 2 起保持此方式）。

export interface LoopStep {
  id: string;
  label: string;
  title: string;
  body: string;
  code: { file: string; lines: string; snippet: string; note?: string };
  events: { name: string; desc: string }[];
  points: string[];
}

export const AGENT_LOOP_INTRO =
  '用六个步骤追踪一个回合。下方代码是教学伪代码，源码路径用于进一步定位实现。';

export const LOOP_STEPS: LoopStep[] = [
  {
    id: 'input',
    label: 'INPUT',
    title: '接收一个用户回合',
    body: '用户请求进入当前会话。先区分回合与内部迭代，再准备运行状态与中断处理。',
    code: {
      file: 'agent/conversation_loop.py',
      lines: '教学伪代码',
      snippet: '接收用户消息\n准备回合状态',
      note: '用于解释控制流，不是可直接执行或逐字摘录的源码。',
    },
    events: [
      {
        name: 'input',
        desc: '教学流程节点；实际事件与实现见所列模块。',
      },
    ],
    points: [
      '一个回合可能请求模型多次。',
      '中断还涉及正在运行的请求与工具，不能只理解成循环外的标志。',
    ],
  },
  {
    id: 'context',
    label: 'CONTEXT',
    title: '准备本次上下文',
    body: '复用已经确定的提示状态，再加入本回合材料。内置记忆是启动快照，保存一条记忆不要求重建当前快照。',
    code: {
      file: 'agent/turn_context.py',
      lines: '教学伪代码',
      snippet: '上下文 = 稳定前缀 + 新消息\n附带本次工具定义',
      note: '用于解释控制流，不是可直接执行或逐字摘录的源码。',
    },
    events: [
      {
        name: 'context',
        desc: '教学流程节点；实际事件与实现见所列模块。',
      },
    ],
    points: [
      '工具定义随请求发送，不等同于普通聊天文字。',
      '结果按调用 ID 配对；一条 assistant 调用后可以有多条 tool 结果。',
    ],
  },
  {
    id: 'model',
    label: 'MODEL',
    title: '调用选定模型路径',
    body: '请求适配层选择实际 API 与传输。支持时由 Python 执行层处理流式响应，界面再渲染增量。',
    code: {
      file: 'agent/turn_api_call.py',
      lines: '教学伪代码',
      snippet: '响应 = 请求模型(上下文, 工具)\n# 传输可以是流式',
      note: '用于解释控制流，不是可直接执行或逐字摘录的源码。',
    },
    events: [
      {
        name: 'request',
        desc: '教学流程节点；实际事件与实现见所列模块。',
      },
    ],
    points: [
      '不同 provider 可走 Chat Completions、Responses 等路径。',
      '模型给出文本，还要核对用户任务是否满足。',
    ],
  },
  {
    id: 'tool',
    label: 'TOOL',
    title: '执行本批工具',
    body: '运行时分发调用、处理必要检查，并可拆为并行与串行段。独立读取可以重叠，冲突写入需要顺序。',
    code: {
      file: 'agent/tool_executor.py',
      lines: '教学伪代码',
      snippet: '分段 = 规划工具批次\n按段执行并收集结果',
      note: '用于解释控制流，不是可直接执行或逐字摘录的源码。',
    },
    events: [
      {
        name: 'dispatch',
        desc: '教学流程节点；实际事件与实现见所列模块。',
      },
    ],
    points: ['模型提出调用，运行时规则决定怎样执行。', '独立上下文不等于独立文件系统。'],
  },
  {
    id: 'result',
    label: 'RESULT',
    title: '追加配对的结果',
    body: '每个结果关联原调用 ID；错误也是可观察结果。大输出可保留受限内容与可读取的存储引用。',
    code: {
      file: 'agent/tool_dispatch_helpers.py',
      lines: '教学伪代码',
      snippet: '追加 结果(调用ID, 输出或错误)\n继续下一次模型迭代',
      note: '用于解释控制流，不是可直接执行或逐字摘录的源码。',
    },
    events: [
      {
        name: 'result',
        desc: '教学流程节点；实际事件与实现见所列模块。',
      },
    ],
    points: ['保留调用结果的对应关系与收集顺序。', '一个工具成功，不一定表示整个任务完成。'],
  },
  {
    id: 'loop',
    label: 'LOOP',
    title: '结束当前回合',
    body: '返回答案，或明确预算、中断、失败结果。持久化、provider 同步各有时机；满足条件的后台复盘与空闲策展是不同机制。',
    code: {
      file: 'agent/turn_finalizer.py',
      lines: '教学伪代码',
      snippet: '整理本回合结果\n按各自路径持久化与同步\n满足条件时发起复盘',
      note: '用于解释控制流，不是可直接执行或逐字摘录的源码。',
    },
    events: [
      {
        name: 'finalize',
        desc: '教学流程节点；实际事件与实现见所列模块。',
      },
    ],
    points: ['回合结束不等于整个会话结束。', '预算收尾文字不等于任务已经通过验收。'],
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const AGENT_LOOP_INTRO_EN =
  'Trace one turn through six phases. Snippets are teaching pseudocode; paths locate the implementation.';

export const LOOP_STEPS_EN: LoopStep[] = [
  {
    id: 'input',
    label: 'INPUT',
    title: 'Accept a user turn',
    body: 'A user request enters the active session. Distinguish one turn from its internal iterations; prepare state and cancellation handling before work.',
    code: {
      file: 'agent/conversation_loop.py',
      lines: 'Teaching pseudocode',
      snippet: 'accept user message\nprepare turn state',
      note: 'Illustrates control flow; not an executable or verbatim source excerpt.',
    },
    events: [
      {
        name: 'input',
        desc: 'Teaching flow node; inspect the named module for actual events.',
      },
    ],
    points: [
      'A turn may call the model repeatedly.',
      'Interrupt handling also involves running requests and tools.',
    ],
  },
  {
    id: 'context',
    label: 'CONTEXT',
    title: 'Prepare the request context',
    body: 'Reuse established prompt state and add the current request. Built-in memory is a startup snapshot; writing it does not rebuild this snapshot.',
    code: {
      file: 'agent/turn_context.py',
      lines: 'Teaching pseudocode',
      snippet: 'context = established prefix + new messages\nattach current tool definitions',
      note: 'Illustrates control flow; not an executable or verbatim source excerpt.',
    },
    events: [
      {
        name: 'context',
        desc: 'Teaching flow node; inspect the named module for actual events.',
      },
    ],
    points: [
      'Tool definitions accompany the request; they are not ordinary chat text.',
      'Call IDs match results; several tool results can follow one assistant message.',
    ],
  },
  {
    id: 'model',
    label: 'MODEL',
    title: 'Call the selected model route',
    body: 'API adaptation chooses the actual transport. Python handles streaming where supported; the interface renders resulting deltas.',
    code: {
      file: 'agent/turn_api_call.py',
      lines: 'Teaching pseudocode',
      snippet: 'response = model_request(context, tools)\n# transport can stream',
      note: 'Illustrates control flow; not an executable or verbatim source excerpt.',
    },
    events: [
      {
        name: 'request',
        desc: 'Teaching flow node; inspect the named module for actual events.',
      },
    ],
    points: [
      'Chat Completions, Responses, and other routes can differ.',
      'A text result still requires task-level verification.',
    ],
  },
  {
    id: 'tool',
    label: 'TOOL',
    title: 'Execute eligible tool calls',
    body: 'The runtime dispatches calls, applies checks, and may split a batch into parallel and sequential segments. Independent reads can overlap; conflicting writes require ordering.',
    code: {
      file: 'agent/tool_executor.py',
      lines: 'Teaching pseudocode',
      snippet: 'segments = plan(tool_calls)\nexecute segments in order',
      note: 'Illustrates control flow; not an executable or verbatim source excerpt.',
    },
    events: [
      {
        name: 'dispatch',
        desc: 'Teaching flow node; inspect the named module for actual events.',
      },
    ],
    points: [
      'The model proposes calls; runtime policy decides execution.',
      'Separate agent context does not imply filesystem isolation.',
    ],
  },
  {
    id: 'result',
    label: 'RESULT',
    title: 'Append matched results',
    body: 'Return a result for each tool-call identifier. Errors become explicit observations. Large outputs can use bounded context and stored references.',
    code: {
      file: 'agent/tool_dispatch_helpers.py',
      lines: 'Teaching pseudocode',
      snippet: 'append result(call_id, output_or_error)\ncontinue model loop',
      note: 'Illustrates control flow; not an executable or verbatim source excerpt.',
    },
    events: [
      {
        name: 'result',
        desc: 'Teaching flow node; inspect the named module for actual events.',
      },
    ],
    points: [
      'Retain call-result association and collection order.',
      'A successful call need not complete the whole task.',
    ],
  },
  {
    id: 'loop',
    label: 'LOOP',
    title: 'Finish the turn',
    body: 'Return an answer or a bounded failure/interrupt outcome. Persistence and provider synchronization have their own timing; eligible background review differs from idle curator maintenance.',
    code: {
      file: 'agent/turn_finalizer.py',
      lines: 'Teaching pseudocode',
      snippet: 'finalize turn\npersist and sync through their paths\nreview only when eligible',
      note: 'Illustrates control flow; not an executable or verbatim source excerpt.',
    },
    events: [
      {
        name: 'finalize',
        desc: 'Teaching flow node; inspect the named module for actual events.',
      },
    ],
    points: [
      'A turn ending is not necessarily a session ending.',
      'Budgets limit consumption; closeout text does not prove success.',
    ],
  },
];

// AgentLoopLab 专属 UI 文案。
export const AGENT_LOOP_UI = {
  hookKicker: {
    zh: '核对',
    en: 'Check',
  },
  hookTitle: {
    zh: '先看依赖，再看执行边界',
    en: 'Follow dependencies and execution boundaries',
  },
  hookBody: {
    zh: '迭代按依赖推进；流式传输、工具并行、持久化与后台复盘分别有自己的路径和条件。',
    en: 'Ordered iterations coexist with streaming, eligible concurrency, persistence, and conditional background review.',
  },
};
