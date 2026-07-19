// Chapter 28「MCP / A2A 互操作」数据源：协议对比面板。
// Hermes 侧事实来源：hermes-agent/AGENTS.md §TUI Architecture / §Electron Desktop、
// mcp_serve.py、acp_adapter/、acp_registry/agent.json、apps/shared/src/json-rpc-gateway.ts。
// MCP / ACP / A2A 的通用事实以各协议官方共识为准；A2A 在 Hermes 中无实现，仅作概念对照。

/* ── 协议卡 ───────────────────────────────────────────────────────── */
export interface ProtocolCard {
  id: string;
  name: string;
  tagline: string;
  parties: string; // 参与方
  payload: string; // 传递内容
  transport: string; // 传输方式
  boundary: string; // 不包括什么（边界）
  whenToUse: string; // 什么时候用
  source: { path: string; note: string }[]; // Hermes 中的源码位置
}

export const INTEROP_INTRO =
  '「互操作」不是一回事，而是四件不同的事：给 Hermes 写前端、给 agent 加工具、' +
  '把 agent 嵌进编辑器、让 agent 找别的 agent 干活。它们分别对应四个协议 / 机制，' +
  '参与方、传输、边界完全不同。点开每张协议卡，先看它「不包括什么」——' +
  '边界比功能更能定义一个协议。';

export const PROTOCOLS: ProtocolCard[] = [
  {
    id: 'tui-rpc',
    name: 'TUI JSON-RPC',
    tagline: 'Hermes 自己的前后端协议',
    parties:
      'Node（Ink 渲染的终端 UI）↔ Python（tui_gateway 后端，持有 AIAgent + tools + sessions）。' +
      'Electron 桌面应用与 Web dashboard 复用同一个后端，只是换成 WebSocket 传输。',
    payload:
      '请求从 Ink 发出：prompt.submit、session.list/resume、approval.respond、slash.exec、' +
      'complete.slash…；事件从 Python 推回：message.delta/complete、tool.start/progress/complete、' +
      'approval.request、gateway.ready。',
    transport:
      '换行分隔（newline-delimited）的 JSON-RPC over stdio；桌面 / 浏览器场景由' +
      ' apps/shared 的 JsonRpcGatewayClient 换成 WebSocket。',
    boundary:
      '不是公开生态协议——方法目录随 Hermes 版本演进（见 tui_gateway/server.py），' +
      '不承诺跨厂商稳定；也不承载「工具能力」，它只是 UI 对会话的遥控。',
    whenToUse:
      '想给 Hermes 写一个自己的终端、桌面或 Web 前端时。' +
      '分工明确：TypeScript 管屏幕，Python 管会话、工具与模型调用。',
    source: [
      { path: 'tui_gateway/server.py', note: '完整的方法 / 事件目录' },
      { path: 'apps/shared/src/json-rpc-gateway.ts', note: 'JsonRpcGatewayClient（WS 传输）' },
    ],
  },
  {
    id: 'mcp',
    name: 'MCP',
    tagline: 'Model Context Protocol：工具与资源的开放插座',
    parties:
      '任意 MCP client（Claude Code、Cursor、Codex…以及 Hermes 内置的 MCP client）↔ MCP server。' +
      'Hermes 两边都站：作为 server 把消息通道暴露给别的 agent，作为 client 消费外部 MCP 工具。',
    payload:
      '工具调用与资源读取。hermes mcp serve 把全平台消息会话暴露成 10 个工具：' +
      'conversations_list、conversation_get、messages_read、attachments_fetch、events_poll、' +
      'events_wait、messages_send、permissions_list_open、permissions_respond，' +
      '外加 Hermes 特有的 channels_list。',
    transport:
      'stdio（MCP 规范，JSON-RPC 消息）；Hermes 侧由 mcp SDK 的 FastMCP 起服务，' +
      '入口 hermes mcp serve。',
    boundary:
      '只管「能力暴露」，不管 agent 循环、会话渲染或 UI——MCP server 里没有 agent，' +
      '只有工具和资源。',
    whenToUse:
      '要给 agent 加一项可被任何 MCP host 复用的能力时。AGENTS.md 的扩展阶梯明确：' +
      '新能力优先做成 MCP server 进 catalog，而不是塞进核心 toolset（核心 schema 零膨胀）。',
    source: [{ path: 'mcp_serve.py', note: 'hermes mcp serve：消息通道 → MCP 工具桥' }],
  },
  {
    id: 'acp',
    name: 'ACP',
    tagline: 'Agent Client Protocol：编辑器 ↔ agent',
    parties:
      '编辑器客户端（VS Code / Zed / JetBrains）↔ agent 进程。' +
      'acp_adapter 把 Hermes 包装成 ACP server，编辑器就是客户端。',
    payload:
      '编辑器侧的会话原语：prompt 提交、消息 / 思考的流式块（AgentMessageChunk /' +
      ' AgentThoughtChunk）、可用命令（AvailableCommandsUpdate）、鉴权与权限审批' +
      '（AuthenticateResponse、edit approval）等。',
    transport:
      'JSON-RPC over stdio——entry.py 刻意把日志写到 stderr，把 stdout 整个留给 ACP 传输。' +
      '启动方式：hermes acp / hermes-acp / uvx "hermes-agent[acp]"。',
    boundary:
      '方向与 MCP 相反：ACP 是「客户端调 agent」，MCP 是「agent 调能力」。' +
      'ACP 不向别的 agent 暴露工具，也不是 agent 间协议。',
    whenToUse:
      '想让用户在编辑器里直接和 Hermes 对话、让它读写代码时。' +
      'acp_registry/agent.json 是提交给 ACP registry 的分发元数据。',
    source: [
      { path: 'acp_adapter/', note: 'server.py / session.py / entry.py…ACP server 实现' },
      { path: 'acp_registry/agent.json', note: 'registry 分发元数据（id、版本、uvx 入口）' },
    ],
  },
  {
    id: 'a2a',
    name: 'A2A',
    tagline: 'Agent-to-Agent：agent 间互操作（概念）',
    parties:
      '两个互相独立的 agent——可能属于不同组织、跑在不同厂商的栈上。' +
      '通过 Agent Card 声明能力，按「任务」而非「消息」协作。',
    payload:
      '任务委派与产物交换：一个 agent 把定义好的 task 交给另一个 agent 执行，' +
      '收回任务状态与 artifact。',
    transport: 'HTTP(S) 上的开放协议（JSON-RPC 风格消息）——跨进程、跨网络、跨组织正是设计前提。',
    boundary:
      '诚实声明：Hermes 当前没有实现 A2A。Hermes 的 agent 间协作发生在进程内——' +
      'delegate_task 派生子 agent（隔离 context + terminal session，并发与深度受限），' +
      '不走开放协议。这张卡是概念对照，不是功能预告。',
    whenToUse:
      '当协作对象是「别人的 agent」、无法共享进程与代码库时。' +
      '如果双方都在 Hermes 内部，delegate_task 是更简单、已经有超时与隔离的答案。',
    source: [{ path: '（Hermes 无对应实现）', note: '对照 tools/delegate_tool.py：进程内委派' }],
  },
];

/* ── 四列对比表 ───────────────────────────────────────────────────── */
export interface CompareRow {
  dimension: string;
  cells: [string, string, string, string]; // tui-rpc / mcp / acp / a2a
}

export const COMPARE_TABLE: CompareRow[] = [
  {
    dimension: '参与方',
    cells: [
      'Hermes 前端 ↔ Hermes 后端',
      'MCP client ↔ MCP server',
      '编辑器 ↔ agent 进程',
      '独立 agent ↔ 独立 agent',
    ],
  },
  {
    dimension: '传递内容',
    cells: [
      '会话请求 + UI 事件流',
      '工具调用 + 资源读取',
      '编辑器会话原语 + 流式块',
      '任务委派 + artifact',
    ],
  },
  {
    dimension: '传输',
    cells: [
      'stdio 换行 JSON-RPC（桌面 / Web 走 WS）',
      'stdio（MCP 规范）',
      'stdio JSON-RPC',
      'HTTP(S) 开放协议',
    ],
  },
  {
    dimension: '不包括',
    cells: [
      '工具能力、跨厂商承诺',
      'agent 循环与 UI',
      '工具暴露、agent 间协作',
      'Hermes 尚未实现（概念对照）',
    ],
  },
  {
    dimension: '什么时候用',
    cells: [
      '给 Hermes 写自己的前端',
      '给 agent 加可复用能力',
      '在编辑器里使用 Hermes',
      '跨组织 / 跨厂商 agent 协作',
    ],
  },
];

/* ── 决策小流程 ───────────────────────────────────────────────────── */
export interface DecisionNode {
  question: string;
  answer: string;
}

export const DECISION_FLOW: DecisionNode[] = [
  {
    question: '要给 agent 加工具或资源？',
    answer: '选 MCP——新能力优先做成 MCP server 进 catalog，不膨胀核心 toolset。',
  },
  {
    question: '要把 agent 嵌进编辑器（VS Code / Zed / JetBrains）？',
    answer: '选 ACP——acp_adapter 把 Hermes 包成 ACP server，编辑器即客户端。',
  },
  {
    question: '要给 Hermes 写自己的终端 / 桌面 UI？',
    answer: '选 TUI JSON-RPC——TypeScript 管屏幕，Python 管会话，方法目录见 tui_gateway/server.py。',
  },
  {
    question: '要让两个互不属于的 agent 协作？',
    answer: '概念上选 A2A；都在 Hermes 内部则直接用 delegate_task，不需要开放协议。',
  },
];
