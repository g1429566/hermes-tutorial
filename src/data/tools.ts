// Chapter 07「工具与 toolsets」数据源：工具路由实验室。
// 内容对齐 hermes-agent/AGENTS.md 的「Adding New Tools」「Toolsets」
// 「File Dependency Chain」三节，以及 tools/registry.py、model_tools.py、
// toolsets.py 的真实实现。每个工具的 schema / 注册行号 / check_fn 均摘自
// 对应 tools/*.py 源文件（手动摘录，保持此方式）。

export interface ToolDatum {
  id: string;
  name: string;
  tagline: string;
  toolset: string;
  file: string; // 实现文件
  registerLine: string; // registry.register() 所在位置
  check: string; // check_fn / requires_env 说明
  schema: string; // JSON schema（手动摘录，长描述有删节）
  note?: string; // 特殊行为说明
}

export const TOOL_ROUTING_INTRO =
  '模型每轮都能拿到一份工具 schema 清单，但一个工具从「tools/ 目录里的 Python 文件」到' +
  '「模型真正调用它」要经过四道门：import 即注册、自动发现、toolset 收录、平台 adapter 选用。' +
  '左侧选一个真实工具，右侧看它的 schema、注册位置与环境检查；下方是这条链路的完整拆解。';

export const TOOLS: ToolDatum[] = [
  {
    id: 'read_file',
    name: 'read_file',
    tagline: '读文本文件（带行号与分页）',
    toolset: 'file',
    file: 'tools/file_tools.py',
    registerLine: 'tools/file_tools.py:2104',
    check:
      'check_fn=_check_file_reqs（文件工具的基础环境检查）；max_result_size_chars=100_000，超长结果截断',
    schema: `{
  "name": "read_file",
  "description": "Read a text file with line numbers and pagination. Use this instead of cat/head/tail in terminal. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "path":   { "type": "string",  "description": "Path to the file to read (absolute, relative, or ~/path)" },
      "offset": { "type": "integer", "description": "Line number to start reading from (1-indexed)", "default": 1 },
      "limit":  { "type": "integer", "description": "Maximum number of lines to read (default: 500, max: 2000)" }
    },
    "required": ["path"]
  }
}`,
    note: '.ipynb / .docx / .xlsx 自动抽取为可读文本；图片与二进制不在此列——走 vision_analyze',
  },
  {
    id: 'patch',
    name: 'patch',
    tagline: '精确编辑文件（replace / patch 双模式）',
    toolset: 'file',
    file: 'tools/file_tools.py',
    registerLine: 'tools/file_tools.py:2106',
    check:
      'check_fn=_check_file_reqs；与 read_file / write_file / search_files 同文件注册（2104–2107 行）',
    schema: `{
  "name": "patch",
  "description": "Edit mode. 'replace' (default): requires path + old_string + new_string. 'patch': requires patch content only.",
  "parameters": {
    "type": "object",
    "properties": {
      "mode":       { "type": "string", "enum": ["replace", "patch"], "default": "replace" },
      "path":       { "type": "string" },
      "old_string": { "type": "string" },
      "new_string": { "type": "string" },
      "patch":      { "type": "string" }
    }
  }
}`,
    note: '技能规范要求：正文里改文件一律指名 `patch`，而不是让模型去拼 sed/awk',
  },
  {
    id: 'search_files',
    name: 'search_files',
    tagline: 'ripgrep 背书的搜索（内容 / 文件名）',
    toolset: 'file',
    file: 'tools/file_tools.py',
    registerLine: 'tools/file_tools.py:2107',
    check: 'check_fn=_check_file_reqs',
    schema: `{
  "name": "search_files",
  "description": "Search file contents or find files by name. Use this instead of grep/rg/find/ls in terminal. Ripgrep-backed. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "pattern":     { "type": "string",  "description": "Regex for content search, or glob (e.g. '*.py') for file search" },
      "target":      { "type": "string",  "enum": ["content", "files"], "default": "content" },
      "path":        { "type": "string",  "default": "." },
      "file_glob":   { "type": "string",  "description": "Filter files by pattern in grep mode" },
      "limit":       { "type": "integer", "default": 50 },
      "offset":      { "type": "integer", "default": 0 },
      "output_mode": { "type": "string",  "enum": ["content", "files_only", "count"], "default": "content" }
    }
  }
}`,
  },
  {
    id: 'terminal',
    name: 'terminal',
    tagline: '在 shell 里执行命令（含后台进程）',
    toolset: 'terminal',
    file: 'tools/terminal_tool.py',
    registerLine: 'tools/terminal_tool.py:3133',
    check:
      'check_fn=check_terminal_requirements——终端后端（local / docker / ssh / modal / daytona / singularity）就绪才暴露',
    schema: `{
  "name": "terminal",
  "description": "Execute a command in the terminal. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "command":            { "type": "string" },
      "background":         { "type": "boolean" },
      "timeout":            { "type": "integer" },
      "workdir":            { "type": "string" },
      "pty":                { "type": "boolean" },
      "notify_on_complete": { "type": "boolean" },
      "watch_patterns":     { "type": "array", "items": { "type": "string" } }
    },
    "required": ["command"]
  }
}`,
    note: 'background=true + notify_on_complete=true 是进程级耐久方案；要扛进程重启的定时工作请用 cronjob',
  },
  {
    id: 'browser_navigate',
    name: 'browser_navigate',
    tagline: '打开 URL，初始化浏览器会话',
    toolset: 'browser',
    file: 'tools/browser_tool.py',
    registerLine: 'tools/browser_tool.py:4864',
    check:
      'check_fn=check_browser_requirements——浏览器栈不可用（无依赖/无显示环境）时整组 browser_* 隐藏',
    schema: `{
  "name": "browser_navigate",
  "description": "Navigate to a URL in the browser. Initializes the session and loads the page. Must be called before other browser tools. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "The URL to navigate to (e.g., 'https://example.com')" }
    },
    "required": ["url"]
  }
}`,
    note: 'browser 工具组共 12 个（snapshot/click/type/scroll/back/press/…），4864–4935 行连续注册，全部挂在 browser toolset 下',
  },
  {
    id: 'delegate_task',
    name: 'delegate_task',
    tagline: '派生子 agent（独立上下文 + 终端）',
    toolset: 'delegation',
    file: 'tools/delegate_tool.py',
    registerLine: 'tools/delegate_tool.py:3574',
    check:
      'role="leaf" 的子 agent 拿不到 delegate_task / clarify / memory 等工具——委派能力按角色收窄',
    schema: `{
  "name": "delegate_task",
  "description": "Spawn a subagent with an isolated context + terminal session. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "goal":       { "type": "string" },
      "context":    { "type": "string" },
      "tasks":      { "type": "array",  "items": { "type": "object" } },
      "role":       { "type": "string", "enum": ["leaf", "orchestrator"] },
      "background": { "type": "boolean" }
    }
  }
}`,
    note: 'background=true 立即返回 delegation id，结果经异步队列回到对话；并发上限 delegation.max_concurrent_children（默认 3）',
  },
  {
    id: 'cronjob',
    name: 'cronjob',
    tagline: '调度定时任务（增删改查一体）',
    toolset: 'cronjob',
    file: 'tools/cronjob_tools.py',
    registerLine: 'tools/cronjob_tools.py:1120',
    check:
      '任务存于 cron/jobs.py，由 cron/scheduler.py 的 tick 循环触发；与用户侧 hermes cron <verb> 操作同一份任务库',
    schema: `{
  "name": "cronjob",
  "description": "Schedule and manage cron jobs. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "action":   { "type": "string" },
      "job_id":   { "type": "string" },
      "prompt":   { "type": "string" },
      "schedule": { "type": "string", "description": "'30m' / '2h' / '1d' 时长、cron 表达式等" },
      "name":     { "type": "string" }
    }
  }
}`,
    note: '耐久性规则：必须扛进程重启的工作用 cronjob，而不是 background delegate_task',
  },
  {
    id: 'memory',
    name: 'memory',
    tagline: '长期记忆增删改（agent 级工具）',
    toolset: 'memory',
    file: 'tools/memory_tool.py',
    registerLine: 'tools/memory_tool.py:1136',
    check: 'agent 级工具：run_agent.py 在 handle_function_call() 之前拦截，不进 registry 分发',
    schema: `{
  "name": "memory",
  "description": "Manage long-term memory entries. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "action":   { "type": "string", "enum": ["add", "replace", "remove"] },
      "target":   { "type": "string", "enum": ["memory", "user"] },
      "content":  { "type": "string" },
      "old_text": { "type": "string" }
    }
  }
}`,
    note: '与 todo 同属「agent-level tools」——拦截模式见 tools/todo_tool.py（AGENTS.md §Adding New Tools 末尾）',
  },
  {
    id: 'web_search',
    name: 'web_search',
    tagline: '网页搜索（需要搜索 API key）',
    toolset: 'web',
    file: 'tools/web_tools.py',
    registerLine: 'tools/web_tools.py:1215',
    check:
      'check_fn=check_web_api_key + requires_env=_web_requires_env()——没配搜索 key 时工具直接不出现',
    schema: `{
  "name": "web_search",
  "description": "Search the web. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "limit": { "type": "integer" }
    },
    "required": ["query"]
  }
}`,
  },
  {
    id: 'todo',
    name: 'todo',
    tagline: '任务清单（agent 级工具）',
    toolset: 'todo',
    file: 'tools/todo_tool.py',
    registerLine: 'tools/todo_tool.py:323',
    check:
      'check_fn=check_todo_requirements；agent 级工具，run_agent.py 拦截处理（run_agent.py 里有对 "todo" 工具名的特判）',
    schema: `{
  "name": "todo",
  "description": "Maintain the task list for this session. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "todos": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id":      { "type": "string" },
            "content": { "type": "string" },
            "status":  { "type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"] }
          },
          "required": ["id", "content", "status"]
        }
      }
    }
  }
}`,
  },
];

/* ── 注册链路：从 Python 文件到模型可见 ────────────────────────── */

export interface ChainStep {
  id: string;
  title: string;
  body: string;
  file: string;
}

export const REGISTER_CHAIN: ChainStep[] = [
  {
    id: 'register',
    title: '① import 即注册',
    body: '每个 tools/*.py 在模块顶层调用 registry.register(name, toolset, schema, handler, check_fn, ...)。没有显式的导入清单——文件被 import，工具就进了 registry 的表。',
    file: 'tools/registry.py · registry.register()',
  },
  {
    id: 'discover',
    title: '② 自动发现',
    body: 'model_tools.py 在模块层调用 discover_builtin_tools()：glob tools/*.py，筛出含顶层 registry.register() 调用的模块逐个 importlib.import_module——失败只告警，不拖垮启动。',
    file: 'model_tools.py · discover_builtin_tools()',
  },
  {
    id: 'toolset',
    title: '③ toolset 收录（手动）',
    body: '注册了 ≠ 模型看得见。工具名必须出现在 toolsets.py 的 TOOLSETS dict 里——要么进 _HERMES_CORE_TOOLS（所有平台继承的默认包），要么进某个专门 toolset。这一步是刻意的手动接线。',
    file: 'toolsets.py · TOOLSETS / _HERMES_CORE_TOOLS',
  },
  {
    id: 'platform',
    title: '④ 平台 adapter 选用',
    body: '每个平台的 adapter 挑一个 base toolset（如 Telegram 用 "messaging"），再叠加 config.yaml 的 tools.<platform>.enabled/disabled 微调；hermes tools（curses UI）可以交互式开关。',
    file: 'toolsets.py · AGENTS.md §Toolsets',
  },
];

/* ── 执行流程：一次 tool_call 的旅程 ───────────────────────────── */

export const EXEC_FLOW: ChainStep[] = [
  {
    id: 'pre',
    title: '① pre_tool_call 钩子',
    body: 'handle_function_call() 先触发插件的 pre_tool_call 钩子：单次触发契约（每次调用恰好一次），可审计参数、可直接拦截并返回阻断消息。',
    file: 'model_tools.py · handle_function_call()',
  },
  {
    id: 'handler',
    title: '② handler 执行',
    body: 'registry 按名字查表分发到 handler，check_fn 不通过或 handler 抛错都会被包装成错误结果——agent 能看到错误并自我纠正，而不是进程崩溃。',
    file: 'tools/registry.py · dispatch',
  },
  {
    id: 'json',
    title: '③ 返回 JSON 字符串',
    body: '所有 handler 必须返回 JSON 字符串（硬性约定），再由 tool_result_message() 包成 role="tool" 的消息 append 进消息流——只追加，不改写，保住 prompt cache。',
    file: 'AGENTS.md §Adding New Tools',
  },
  {
    id: 'post',
    title: '④ post_tool_call 钩子',
    body: 'post_tool_call 是观察性钩子（不阻断）：记录时延、审计结果、供插件做后处理。没有插件注册时廉价空转。',
    file: 'model_tools.py · _emit_post_tool_call_hook()',
  },
];

export const TOOL_ROUTING_HOOK =
  '想加一个工具？两个文件：tools/your_tool.py 里 registry.register()，toolsets.py 里把名字加进 TOOLSETS。' +
  '发现是自动的，收录是刻意的——这就是 Hermes 的工具哲学。';

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const TOOL_ROUTING_INTRO_EN =
  'Every turn, the model gets a list of tool schemas — but a tool travels through four gates from ' +
  '"a Python file in tools/" to "actually called by the model": register-on-import, auto-discovery, ' +
  'toolset inclusion, and platform adapter selection. Pick a real tool on the left to see its schema, ' +
  'registration site, and environment check on the right; below is the full breakdown of this pipeline.';

export const TOOLS_EN: ToolDatum[] = [
  {
    id: 'read_file',
    name: 'read_file',
    tagline: 'Read a text file (with line numbers and pagination)',
    toolset: 'file',
    file: 'tools/file_tools.py',
    registerLine: 'tools/file_tools.py:2104',
    check:
      'check_fn=_check_file_reqs (base environment check for file tools); max_result_size_chars=100_000, longer results are truncated',
    schema: `{
  "name": "read_file",
  "description": "Read a text file with line numbers and pagination. Use this instead of cat/head/tail in terminal. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "path":   { "type": "string",  "description": "Path to the file to read (absolute, relative, or ~/path)" },
      "offset": { "type": "integer", "description": "Line number to start reading from (1-indexed)", "default": 1 },
      "limit":  { "type": "integer", "description": "Maximum number of lines to read (default: 500, max: 2000)" }
    },
    "required": ["path"]
  }
}`,
    note: '.ipynb / .docx / .xlsx are auto-extracted into readable text; images and binaries are not — use vision_analyze',
  },
  {
    id: 'patch',
    name: 'patch',
    tagline: 'Precise file editing (replace / patch dual modes)',
    toolset: 'file',
    file: 'tools/file_tools.py',
    registerLine: 'tools/file_tools.py:2106',
    check:
      'check_fn=_check_file_reqs; registered in the same file as read_file / write_file / search_files (lines 2104–2107)',
    schema: `{
  "name": "patch",
  "description": "Edit mode. 'replace' (default): requires path + old_string + new_string. 'patch': requires patch content only.",
  "parameters": {
    "type": "object",
    "properties": {
      "mode":       { "type": "string", "enum": ["replace", "patch"], "default": "replace" },
      "path":       { "type": "string" },
      "old_string": { "type": "string" },
      "new_string": { "type": "string" },
      "patch":      { "type": "string" }
    }
  }
}`,
    note: 'Skill authoring standards require: file edits in skill bodies must name `patch`, never make the model assemble sed/awk',
  },
  {
    id: 'search_files',
    name: 'search_files',
    tagline: 'Ripgrep-backed search (contents / file names)',
    toolset: 'file',
    file: 'tools/file_tools.py',
    registerLine: 'tools/file_tools.py:2107',
    check: 'check_fn=_check_file_reqs',
    schema: `{
  "name": "search_files",
  "description": "Search file contents or find files by name. Use this instead of grep/rg/find/ls in terminal. Ripgrep-backed. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "pattern":     { "type": "string",  "description": "Regex for content search, or glob (e.g. '*.py') for file search" },
      "target":      { "type": "string",  "enum": ["content", "files"], "default": "content" },
      "path":        { "type": "string",  "default": "." },
      "file_glob":   { "type": "string",  "description": "Filter files by pattern in grep mode" },
      "limit":       { "type": "integer", "default": 50 },
      "offset":      { "type": "integer", "default": 0 },
      "output_mode": { "type": "string",  "enum": ["content", "files_only", "count"], "default": "content" }
    }
  }
}`,
  },
  {
    id: 'terminal',
    name: 'terminal',
    tagline: 'Execute commands in a shell (incl. background processes)',
    toolset: 'terminal',
    file: 'tools/terminal_tool.py',
    registerLine: 'tools/terminal_tool.py:3133',
    check:
      'check_fn=check_terminal_requirements — exposed only when a terminal backend (local / docker / ssh / modal / daytona / singularity) is ready',
    schema: `{
  "name": "terminal",
  "description": "Execute a command in the terminal. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "command":            { "type": "string" },
      "background":         { "type": "boolean" },
      "timeout":            { "type": "integer" },
      "workdir":            { "type": "string" },
      "pty":                { "type": "boolean" },
      "notify_on_complete": { "type": "boolean" },
      "watch_patterns":     { "type": "array", "items": { "type": "string" } }
    },
    "required": ["command"]
  }
}`,
    note: 'background=true + notify_on_complete=true is process-level durability; for scheduled work that must survive process restarts, use cronjob',
  },
  {
    id: 'browser_navigate',
    name: 'browser_navigate',
    tagline: 'Open a URL and initialize the browser session',
    toolset: 'browser',
    file: 'tools/browser_tool.py',
    registerLine: 'tools/browser_tool.py:4864',
    check:
      'check_fn=check_browser_requirements — the whole browser_* group is hidden when the browser stack is unavailable (missing deps / no display)',
    schema: `{
  "name": "browser_navigate",
  "description": "Navigate to a URL in the browser. Initializes the session and loads the page. Must be called before other browser tools. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "The URL to navigate to (e.g., 'https://example.com')" }
    },
    "required": ["url"]
  }
}`,
    note: 'The browser group has 12 tools (snapshot/click/type/scroll/back/press/…), registered contiguously at lines 4864–4935, all under the browser toolset',
  },
  {
    id: 'delegate_task',
    name: 'delegate_task',
    tagline: 'Spawn a subagent (isolated context + terminal)',
    toolset: 'delegation',
    file: 'tools/delegate_tool.py',
    registerLine: 'tools/delegate_tool.py:3574',
    check:
      'Subagents with role="leaf" do not get delegate_task / clarify / memory and similar tools — delegation capability is narrowed by role',
    schema: `{
  "name": "delegate_task",
  "description": "Spawn a subagent with an isolated context + terminal session. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "goal":       { "type": "string" },
      "context":    { "type": "string" },
      "tasks":      { "type": "array",  "items": { "type": "object" } },
      "role":       { "type": "string", "enum": ["leaf", "orchestrator"] },
      "background": { "type": "boolean" }
    }
  }
}`,
    note: 'background=true returns a delegation id immediately; results come back to the conversation via an async queue; concurrency cap delegation.max_concurrent_children (default 3)',
  },
  {
    id: 'cronjob',
    name: 'cronjob',
    tagline: 'Schedule cron jobs (CRUD in one tool)',
    toolset: 'cronjob',
    file: 'tools/cronjob_tools.py',
    registerLine: 'tools/cronjob_tools.py:1120',
    check:
      'Jobs live in cron/jobs.py, fired by the tick loop in cron/scheduler.py; shares the same job store as the user-facing hermes cron <verb>',
    schema: `{
  "name": "cronjob",
  "description": "Schedule and manage cron jobs. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "action":   { "type": "string" },
      "job_id":   { "type": "string" },
      "prompt":   { "type": "string" },
      "schedule": { "type": "string", "description": "'30m' / '2h' / '1d' 时长、cron 表达式等" },
      "name":     { "type": "string" }
    }
  }
}`,
    note: 'Durability rule: work that must survive process restarts uses cronjob, not background delegate_task',
  },
  {
    id: 'memory',
    name: 'memory',
    tagline: 'Long-term memory CRUD (agent-level tool)',
    toolset: 'memory',
    file: 'tools/memory_tool.py',
    registerLine: 'tools/memory_tool.py:1136',
    check:
      'Agent-level tool: intercepted by run_agent.py before handle_function_call(), never dispatched through the registry',
    schema: `{
  "name": "memory",
  "description": "Manage long-term memory entries. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "action":   { "type": "string", "enum": ["add", "replace", "remove"] },
      "target":   { "type": "string", "enum": ["memory", "user"] },
      "content":  { "type": "string" },
      "old_text": { "type": "string" }
    }
  }
}`,
    note: 'Same "agent-level tools" family as todo — see the interception pattern in tools/todo_tool.py (end of AGENTS.md §Adding New Tools)',
  },
  {
    id: 'web_search',
    name: 'web_search',
    tagline: 'Web search (requires a search API key)',
    toolset: 'web',
    file: 'tools/web_tools.py',
    registerLine: 'tools/web_tools.py:1215',
    check:
      'check_fn=check_web_api_key + requires_env=_web_requires_env() — without a configured search key the tool simply does not appear',
    schema: `{
  "name": "web_search",
  "description": "Search the web. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "limit": { "type": "integer" }
    },
    "required": ["query"]
  }
}`,
  },
  {
    id: 'todo',
    name: 'todo',
    tagline: 'Task list (agent-level tool)',
    toolset: 'todo',
    file: 'tools/todo_tool.py',
    registerLine: 'tools/todo_tool.py:323',
    check:
      'check_fn=check_todo_requirements; agent-level tool, intercepted by run_agent.py (there is a special case for the "todo" tool name in run_agent.py)',
    schema: `{
  "name": "todo",
  "description": "Maintain the task list for this session. ...",
  "parameters": {
    "type": "object",
    "properties": {
      "todos": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id":      { "type": "string" },
            "content": { "type": "string" },
            "status":  { "type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"] }
          },
          "required": ["id", "content", "status"]
        }
      }
    }
  }
}`,
  },
];

export const REGISTER_CHAIN_EN: ChainStep[] = [
  {
    id: 'register',
    title: '① Register on import',
    body: 'Every tools/*.py calls registry.register(name, toolset, schema, handler, check_fn, ...) at module top level. There is no explicit import manifest — once the file is imported, the tool is in the registry table.',
    file: 'tools/registry.py · registry.register()',
  },
  {
    id: 'discover',
    title: '② Auto-discovery',
    body: 'model_tools.py calls discover_builtin_tools() at module level: globs tools/*.py, picks modules with a top-level registry.register() call, and importlib.import_module()s each one — failures only warn, never break startup.',
    file: 'model_tools.py · discover_builtin_tools()',
  },
  {
    id: 'toolset',
    title: '③ Toolset inclusion (manual)',
    body: 'Registered ≠ visible to the model. The tool name must appear in the TOOLSETS dict in toolsets.py — either in _HERMES_CORE_TOOLS (the default package every platform inherits) or in a dedicated toolset. This step is deliberately manual wiring.',
    file: 'toolsets.py · TOOLSETS / _HERMES_CORE_TOOLS',
  },
  {
    id: 'platform',
    title: '④ Platform adapter selection',
    body: 'Each platform adapter picks a base toolset (e.g. Telegram uses "messaging"), then fine-tunes via tools.<platform>.enabled/disabled in config.yaml; hermes tools (curses UI) toggles them interactively.',
    file: 'toolsets.py · AGENTS.md §Toolsets',
  },
];

export const EXEC_FLOW_EN: ChainStep[] = [
  {
    id: 'pre',
    title: '① pre_tool_call hook',
    body: 'handle_function_call() first fires the plugin pre_tool_call hook: a fire-exactly-once-per-call contract that can audit arguments or intercept the call outright and return a blocking message.',
    file: 'model_tools.py · handle_function_call()',
  },
  {
    id: 'handler',
    title: '② Handler execution',
    body: 'The registry looks up the name and dispatches to the handler. A failed check_fn or a handler exception is wrapped into an error result — the agent sees the error and self-corrects instead of crashing the process.',
    file: 'tools/registry.py · dispatch',
  },
  {
    id: 'json',
    title: '③ Return a JSON string',
    body: 'Every handler must return a JSON string (hard contract), which tool_result_message() then wraps into a role="tool" message appended to the message stream — append only, never rewrite, keeping the prompt cache intact.',
    file: 'AGENTS.md §Adding New Tools',
  },
  {
    id: 'post',
    title: '④ post_tool_call hook',
    body: 'post_tool_call is an observational hook (non-blocking): it records latency, audits results, and lets plugins post-process. With no plugins registered it spins cheaply.',
    file: 'model_tools.py · _emit_post_tool_call_hook()',
  },
];

export const TOOL_ROUTING_HOOK_EN =
  'Want to add a tool? Two files: registry.register() in tools/your_tool.py, and add the name to TOOLSETS in toolsets.py. ' +
  'Discovery is automatic; inclusion is deliberate — that is the Hermes tool philosophy.';

// ToolRoutingLab 专属 UI 文案。
export const TOOL_ROUTING_UI = {
  implFile: { zh: '实现文件', en: 'Source file' },
  registerAt: { zh: '注册位置', en: 'Registered at' },
  noteLabel: { zh: '备注', en: 'Note' },
  schemaFile: {
    zh: (toolset: string) => `schema · toolsets.py 的 "${toolset}" toolset 收录后模型可见`,
    en: (toolset: string) =>
      `schema · visible to the model once included in the "${toolset}" toolset in toolsets.py`,
  },
  schemaNote: {
    zh: '所有 handler 必须返回 JSON 字符串（AGENTS.md 硬性约定）',
    en: 'Every handler must return a JSON string (hard contract in AGENTS.md)',
  },
  chainKicker: { zh: '注册链路', en: 'Registration pipeline' },
  chainTitle: {
    zh: '从 tools/*.py 到模型可见：四道门',
    en: 'From tools/*.py to model-visible: four gates',
  },
  depChain: {
    zh: '依赖链方向：tools/registry.py（无依赖）← tools/*.py ← model_tools.py ← run_agent.py / cli.py / batch_runner.py（AGENTS.md §File Dependency Chain）',
    en: 'Dependency chain: tools/registry.py (no deps) ← tools/*.py ← model_tools.py ← run_agent.py / cli.py / batch_runner.py (AGENTS.md §File Dependency Chain)',
  },
  execKicker: { zh: '执行流程', en: 'Execution flow' },
  execTitle: { zh: '一次 tool_call 的旅程', en: 'The journey of one tool_call' },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住工具路由', en: 'Tool routing in one sentence' },
};
