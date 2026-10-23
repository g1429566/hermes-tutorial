// Chapter 28「MCP / A2A 互操作」数据源：协议对比面板。
// Hermes 侧事实来源：hermes-agent/AGENTS.md §TUI Architecture / §Electron Desktop、
// plugin-catalog/mcp-serve.yaml、acp_adapter/、plugins/platforms/a2a/、apps/shared/src/json-rpc-gateway.ts。
// MCP 客户端侧（hermes mcp add 接外部 server）在 tools/mcp_tool*.py。
// MCP / ACP / A2A 的通用事实以各协议官方共识为准；A2A 已由 plugins/platforms/a2a 实现（v1.0）。

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
      'complete.slash…；事件从 Python 推回：message.delta/complete、tool.start/generating/complete、' +
      'gateway.ready…。审批已升级为 server→client 请求（method=approval），' +
      '客户端不应答时由 request.cancel 撤回。',
    transport:
      '换行分隔（newline-delimited）的 JSON-RPC over stdio；桌面 / 浏览器场景由' +
      ' apps/shared 的 JsonRpcGatewayClient 换成 WebSocket。',
    boundary:
      '不是公开生态协议——方法目录随 Hermes 版本演进（由 tui_gateway/contracts 声明、' +
      'server.py 承载），不承诺跨厂商稳定；也不承载「工具能力」，它只是 UI 对会话的遥控。',
    whenToUse:
      '想给 Hermes 写一个自己的终端、桌面或 Web 前端时。' +
      '分工明确：TypeScript 管屏幕，Python 管会话、工具与模型调用。',
    source: [
      { path: 'tui_gateway/server.py', note: '方法 / 事件目录的 facade（contracts/ 声明）' },
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
      '工具调用与资源读取。mcp-serve 插件（hermes mcp-serve 命令）把全平台消息会话暴露成 10 个工具：' +
      'conversations_list、conversation_get、messages_read、attachments_fetch、events_poll、' +
      'events_wait、messages_send、permissions_list_open、permissions_respond，' +
      '外加 Hermes 特有的 channels_list。',
    transport:
      'stdio（MCP 规范，JSON-RPC 消息）；Hermes 作 MCP server 的能力由官方 mcp-serve 插件提供' +
      '（hermes plugins install mcp-serve，装后命令 hermes mcp-serve；原内置的 hermes mcp serve 已移出核心树，' +
      'mcp 2.0 已移除 FastMCP）。',
    boundary:
      '只管「能力暴露」，不管 agent 循环、会话渲染或 UI——MCP server 里没有 agent，' +
      '只有工具和资源。',
    whenToUse:
      '要给 agent 加一项可被任何 MCP host 复用的能力时。AGENTS.md 的扩展阶梯明确：' +
      '新能力优先做成 MCP server 进 catalog，而不是塞进核心 toolset（核心 schema 零膨胀）。',
    source: [
      {
        path: 'plugin-catalog/mcp-serve.yaml',
        note: 'mcp-serve 插件：Hermes 作 MCP server（原 hermes mcp serve，已移出核心树）',
      },
      {
        path: 'tools/mcp_tool.py',
        note: 'MCP 客户端侧：hermes mcp add 把外部 MCP server 接成 agent 工具',
      },
    ],
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
      '分发入口是 pyproject.toml 的 [acp] extra 与 hermes-acp script（uvx "hermes-agent[acp]"）；' +
      'ACP registry 要求的 auth 方法由 acp_adapter/auth.py 在握手时构造。',
    source: [
      { path: 'acp_adapter/', note: 'server.py / session.py / entry.py…ACP server 实现' },
      { path: 'pyproject.toml', note: '[acp] extra 与 hermes-acp script（uvx 分发入口）' },
      { path: 'acp_adapter/auth.py', note: 'registry 要求的 auth 方法构造' },
    ],
  },
  {
    id: 'a2a',
    name: 'A2A',
    tagline: 'Agent-to-Agent：跨组织 agent 的开放任务协议',
    parties:
      '两个互相独立的 agent——可能属于不同组织、跑在不同厂商的栈上。' +
      '通过 Agent Card 声明能力，按「任务」而非「消息」协作。',
    payload:
      '任务委派与产物交换：一个 agent 把定义好的 task 交给另一个 agent 执行，' +
      '收回任务状态与 artifact。',
    transport:
      'HTTP(S) 上的开放协议（JSON-RPC 风格消息，SSE 流式）——跨进程、跨网络、跨组织正是设计前提。',
    boundary:
      'Hermes 已加入 A2A v1.0：plugins/platforms/a2a 网关平台插件既对外提供 Agent Card' +
      '（/.well-known/agent-card.json）与 JSON-RPC 任务接口，也内置 a2a_discover / a2a_call 等' +
      '5 个 outbound 工具；不配 token 时只绑 localhost。进程内的 agent 协作仍走 delegate_task，' +
      '两者互补。',
    whenToUse:
      '当协作对象是「别人的 agent」、无法共享进程与代码库时：启用 a2a 平台即可被发现与被调用。' +
      '如果双方都在 Hermes 内部，delegate_task 仍是更简单、自带隔离的答案。',
    source: [
      { path: 'plugins/platforms/a2a/', note: 'A2A v1.0 平台插件：Agent Card + a2a_* 工具' },
    ],
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
      '不替代进程内委派；无 token 仅绑 localhost',
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
    answer:
      '选 A2A——plugins/platforms/a2a 让 Hermes 既能被发现调用、也能调用别人；都在 Hermes 内部则直接用 delegate_task，不需要开放协议。',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const INTEROP_INTRO_EN =
  '“Interoperability” is not one thing but four different ones: writing a frontend for Hermes, ' +
  'adding tools to the agent, embedding the agent in an editor, and letting an agent hire other ' +
  'agents. Each maps to a different protocol / mechanism, with entirely different parties, ' +
  'transports, and boundaries. Open each protocol card and read “what it doesn’t cover” first — ' +
  'a protocol is defined more by its boundary than by its features.';

export const PROTOCOLS_EN: ProtocolCard[] = [
  {
    id: 'tui-rpc',
    name: 'TUI JSON-RPC',
    tagline: 'Hermes’s own frontend-backend protocol',
    parties:
      'Node (the Ink-rendered terminal UI) ↔ Python (the tui_gateway backend, holding AIAgent + ' +
      'tools + sessions). The Electron desktop app and the Web dashboard reuse the same backend, ' +
      'just over WebSocket transport.',
    payload:
      'Requests sent from Ink: prompt.submit, session.list/resume, approval.respond, slash.exec, ' +
      'complete.slash…; events pushed back from Python: message.delta/complete, ' +
      'tool.start/generating/complete, gateway.ready…. Approvals are now server→client requests ' +
      '(method=approval), withdrawn via request.cancel when no client answers.',
    transport:
      'Newline-delimited JSON-RPC over stdio; for desktop / browser scenarios, JsonRpcGatewayClient ' +
      'in apps/shared switches it to WebSocket.',
    boundary:
      'Not a public ecosystem protocol — the method catalog evolves with Hermes versions (declared in ' +
      'tui_gateway/contracts, served by server.py) with no cross-vendor stability promise; it also ' +
      'carries no “tool capabilities” — it is only the UI’s remote control over the session.',
    whenToUse:
      'When you want to write your own terminal, desktop, or Web frontend for Hermes. The division ' +
      'of labor is clear: TypeScript owns the screen, Python owns sessions, tools, and model calls.',
    source: [
      {
        path: 'tui_gateway/server.py',
        note: 'facade of the method / event catalog (declared in contracts/)',
      },
      { path: 'apps/shared/src/json-rpc-gateway.ts', note: 'JsonRpcGatewayClient (WS transport)' },
    ],
  },
  {
    id: 'mcp',
    name: 'MCP',
    tagline: 'Model Context Protocol: an open socket for tools and resources',
    parties:
      'Any MCP client (Claude Code, Cursor, Codex… plus Hermes’s built-in MCP client) ↔ an MCP ' +
      'server. Hermes stands on both sides: as a server it exposes its messaging channels to other ' +
      'agents; as a client it consumes external MCP tools.',
    payload:
      'Tool calls and resource reads. The mcp-serve plugin (hermes mcp-serve command) exposes ' +
      'all-platform messaging sessions as 10 tools: conversations_list, conversation_get, ' +
      'messages_read, attachments_fetch, events_poll, events_wait, messages_send, ' +
      'permissions_list_open, permissions_respond, plus the Hermes-specific channels_list.',
    transport:
      'stdio (per the MCP spec, JSON-RPC messages); running Hermes itself as an MCP server is the ' +
      'official mcp-serve plugin (hermes plugins install mcp-serve, then the hermes mcp-serve command; ' +
      'the formerly built-in hermes mcp serve moved out of core, and mcp 2.0 removed FastMCP).',
    boundary:
      'Only “capability exposure” — no agent loop, session rendering, or UI. There is no agent ' +
      'inside an MCP server, only tools and resources.',
    whenToUse:
      'When adding a capability to the agent that any MCP host can reuse. AGENTS.md’s extension ' +
      'ladder is explicit: new capabilities should first become an MCP server in the catalog, not ' +
      'be stuffed into the core toolset (zero core schema bloat).',
    source: [
      {
        path: 'plugin-catalog/mcp-serve.yaml',
        note: 'mcp-serve plugin: run Hermes as an MCP server (formerly hermes mcp serve, moved out of core)',
      },
      {
        path: 'tools/mcp_tool.py',
        note: 'MCP client side: hermes mcp add wires external MCP servers in as agent tools',
      },
    ],
  },
  {
    id: 'acp',
    name: 'ACP',
    tagline: 'Agent Client Protocol: editor ↔ agent',
    parties:
      'An editor client (VS Code / Zed / JetBrains) ↔ an agent process. acp_adapter wraps Hermes ' +
      'as an ACP server, and the editor is the client.',
    payload:
      'Editor-side session primitives: prompt submission, streamed message / thought chunks ' +
      '(AgentMessageChunk / AgentThoughtChunk), available commands (AvailableCommandsUpdate), ' +
      'authentication and permission approvals (AuthenticateResponse, edit approval), etc.',
    transport:
      'JSON-RPC over stdio — entry.py deliberately writes logs to stderr, reserving all of stdout ' +
      'for the ACP transport. Launch via hermes acp / hermes-acp / uvx "hermes-agent[acp]".',
    boundary:
      'The direction is opposite to MCP: ACP is “client calls agent,” MCP is “agent calls ' +
      'capability.” ACP exposes no tools to other agents and is not an agent-to-agent protocol.',
    whenToUse:
      'When you want users to talk to Hermes directly inside an editor and let it read and write ' +
      'code. The distribution entry is pyproject.toml’s [acp] extra plus the hermes-acp script (uvx ' +
      '"hermes-agent[acp]"); the auth methods the ACP registry requires are built at handshake time ' +
      'by acp_adapter/auth.py.',
    source: [
      {
        path: 'acp_adapter/',
        note: 'server.py / session.py / entry.py… the ACP server implementation',
      },
      {
        path: 'pyproject.toml',
        note: '[acp] extra and hermes-acp script (uvx distribution entry)',
      },
      {
        path: 'acp_adapter/auth.py',
        note: 'constructs the registry-required auth methods',
      },
    ],
  },
  {
    id: 'a2a',
    name: 'A2A',
    tagline: 'Agent-to-Agent: an open task protocol across agents',
    parties:
      'Two mutually independent agents — possibly owned by different organizations and running on ' +
      'different vendors’ stacks. Capabilities are declared via an Agent Card, and collaboration is ' +
      'by “task,” not “message.”',
    payload:
      'Task delegation and artifact exchange: one agent hands a well-defined task to another and ' +
      'receives task status and artifacts back.',
    transport:
      'An open protocol over HTTP(S) (JSON-RPC-style messages, SSE streaming) — cross-process, cross-network, cross-organization is the design premise.',
    boundary:
      'Hermes now ships A2A v1.0 support via the plugins/platforms/a2a gateway platform: inbound it ' +
      'serves an Agent Card (/.well-known/agent-card.json) with JSON-RPC task endpoints; outbound it ' +
      'bundles five tools (a2a_discover / a2a_call / …). Without a token it binds to localhost only. ' +
      'In-process collaboration still goes through delegate_task — the two are complementary.',
    whenToUse:
      'When the collaborator is “someone else’s agent” and you can’t share a process or codebase: ' +
      'enable the a2a platform and Hermes can be discovered and called. If both sides live inside ' +
      'Hermes, delegate_task remains the simpler answer with built-in isolation.',
    source: [
      {
        path: 'plugins/platforms/a2a/',
        note: 'A2A v1.0 platform plugin: Agent Card + a2a_* tools',
      },
    ],
  },
];

export const COMPARE_TABLE_EN: CompareRow[] = [
  {
    dimension: 'Parties',
    cells: [
      'Hermes frontend ↔ Hermes backend',
      'MCP client ↔ MCP server',
      'Editor ↔ agent process',
      'Independent agent ↔ independent agent',
    ],
  },
  {
    dimension: 'Payload',
    cells: [
      'Session requests + UI event stream',
      'Tool calls + resource reads',
      'Editor session primitives + streamed chunks',
      'Task delegation + artifacts',
    ],
  },
  {
    dimension: 'Transport',
    cells: [
      'stdio newline-delimited JSON-RPC (WS for desktop / Web)',
      'stdio (MCP spec)',
      'stdio JSON-RPC',
      'Open protocol over HTTP(S)',
    ],
  },
  {
    dimension: 'Not included',
    cells: [
      'Tool capabilities, cross-vendor promises',
      'Agent loop and UI',
      'Tool exposure, inter-agent collaboration',
      'No in-process delegation replacement; localhost-only without a token',
    ],
  },
  {
    dimension: 'When to use',
    cells: [
      'Writing your own frontend for Hermes',
      'Adding reusable capabilities to an agent',
      'Using Hermes inside an editor',
      'Cross-org / cross-vendor agent collaboration',
    ],
  },
];

export const DECISION_FLOW_EN: DecisionNode[] = [
  {
    question: 'Adding tools or resources to an agent?',
    answer:
      'Choose MCP — new capabilities should first become an MCP server in the catalog, not bloat the core toolset.',
  },
  {
    question: 'Embedding the agent in an editor (VS Code / Zed / JetBrains)?',
    answer: 'Choose ACP — acp_adapter wraps Hermes as an ACP server and the editor is the client.',
  },
  {
    question: 'Writing your own terminal / desktop UI for Hermes?',
    answer:
      'Choose TUI JSON-RPC — TypeScript owns the screen, Python owns sessions; the method catalog lives in tui_gateway/server.py.',
  },
  {
    question: 'Making two mutually independent agents collaborate?',
    answer:
      'Choose A2A — plugins/platforms/a2a lets Hermes be discovered and called, and call others; if both are inside Hermes, just use delegate_task — no open protocol needed.',
  },
];

// InteropLab 专属 UI 文案（中英对）。
export const INTEROP_UI = {
  parties: { zh: '参与方', en: 'Parties' },
  payload: { zh: '传递内容', en: 'Payload' },
  transport: { zh: '传输方式', en: 'Transport' },
  boundary: { zh: '不包括什么（边界）', en: 'What’s not covered (boundary)' },
  whenToUse: { zh: '什么时候用', en: 'When to use' },
  sourceHeading: { zh: 'Hermes 中的源码位置', en: 'Source locations in Hermes' },
  tableKicker: { zh: '总结', en: 'SUMMARY' },
  tableTitle: { zh: '一张表看清四个协议', en: 'Four protocols, one table' },
  dimension: { zh: '维度', en: 'Dimension' },
  highlightNote: {
    zh: '当前选中的协议列已高亮。',
    en: 'The selected protocol’s column is highlighted.',
  },
  decisionKicker: { zh: '决策', en: 'DECISION' },
  decisionTitle: { zh: '什么时候选哪个', en: 'Which one to pick, when' },
};
