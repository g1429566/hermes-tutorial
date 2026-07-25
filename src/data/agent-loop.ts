// Chapter 04「Agent 主循环」数据源：六步步进器。
// 内容对齐 hermes-agent/AGENTS.md 的「AIAgent Class」与「Agent Loop」一节，
// 代码片段摘自 run_agent.py 的真实循环结构（手动摘录，阶段 2 起保持此方式）。

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
  '整个 Hermes 的心脏是 run_agent.py 里 AIAgent.run_conversation() 中的一个同步 while 循环：' +
  '组装消息 → 调模型 → 有工具调用就执行并追加结果 → 再调模型，直到模型直接返回文本或触碰预算上限。' +
  '点击下面六个步骤，看每一步对应的真实源码与事件流。';

export const LOOP_STEPS: LoopStep[] = [
  {
    id: 'input',
    label: 'INPUT',
    title: '输入进入 run_conversation()',
    body: '用户消息以 OpenAI 消息格式进入循环。入口有两个：chat(message) 只回最终文本；run_conversation() 返回完整 dict（final_response + messages）。循环每次迭代开头先检查中断标志——用户在 CLI 里按 Esc 能把 agent 从循环里拽回来。',
    code: {
      file: 'run_agent.py',
      lines: 'run_conversation()',
      snippet: `def run_conversation(self, user_message, system_message=None,
                     conversation_history=None, task_id=None) -> dict:
    messages = self._build_messages(user_message, system_message,
                                    conversation_history)
    while (api_call_count < self.max_iterations
           and self.iteration_budget.remaining > 0) \\
           or self._budget_grace_call:
        if self._interrupt_requested:
            break`,
      note: '消息遵循 OpenAI 格式：{"role": "system/user/assistant/tool", ...}',
    },
    events: [
      { name: 'user.message', desc: '用户输入进入会话' },
      { name: 'interrupt.check', desc: '每次迭代开头检查 _interrupt_requested' },
    ],
    points: [
      'max_iterations 默认 90（与子 agent 共享）',
      'iteration_budget 与「one-turn grace call」：预算耗尽后仍给最后一轮机会',
      '中断不是异常，是循环条件的一部分',
    ],
  },
  {
    id: 'context',
    label: 'CONTEXT',
    title: '上下文组装（缓存是圣物）',
    body: '系统提示 + 工具 schema + 历史消息组装成 messages 数组。Hermes 的第一设计约束是 per-conversation prompt caching：长对话每一轮都复用缓存前缀，所以循环中途绝不改工具集、不重建系统提示——唯一的例外是上下文压缩。技能斜杠命令注入为 user 消息而非 system prompt，也是为了不破缓存。',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'AGENTS.md §CLI Architecture',
      snippet: `# 技能命令以 user 消息注入，而不是改写 system prompt——
# 任何中途改写 past context 的行为都会让缓存失效、成本翻倍。
# 「Do NOT: alter past context / change toolsets /
#  reload memories / rebuild system prompts mid-conversation」`,
      note: '唯一允许的上下文变更：context compression',
    },
    events: [
      { name: 'context.build', desc: '组装 system + tools + history（只在会话开始）' },
      { name: 'cache.hit', desc: '后续轮次复用缓存前缀' },
    ],
    points: [
      '工具 schema 随 messages 一起发出：tool_schemas',
      'reasoning 内容存在 assistant_msg["reasoning"]',
      '改技能/工具默认「下次会话生效」，--now 才立即失效缓存',
    ],
  },
  {
    id: 'model',
    label: 'MODEL',
    title: '调用模型',
    body: '同步调用 chat.completions.create——没有流式复杂度的主循环（流式在显示层处理）。模型返回两种东西之一：tool_calls（继续循环）或纯文本 content（结束循环）。provider 适配层把不同后端统一成这一种形状。',
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `response = client.chat.completions.create(
    model=model, messages=messages, tools=tool_schemas)
if response.tool_calls:
    ...  # 执行工具，继续循环
else:
    return response.content  # 最终回答`,
    },
    events: [
      { name: 'pre_llm_call', desc: '插件钩子：调用前（可审计/改写）' },
      { name: 'post_llm_call', desc: '插件钩子：调用后' },
    ],
    points: [
      'pre/post_llm_call 是插件的生命周期钩子',
      'provider 插件把 openrouter / anthropic / gmi 等统一成同一接口',
      'fallback_model 与 credential_pool 处理单点故障',
    ],
  },
  {
    id: 'tool',
    label: 'TOOL',
    title: '工具调用分发',
    body: '每个 tool_call 交给 handle_function_call(name, args, task_id)：registry 查表、beforeToolCall 钩子、执行 handler、包装错误、返回 JSON 字符串。todo / memory 这类 agent 级工具在进 handle_function_call 之前就被 run_agent.py 拦截。工具能不能用，取决于 toolsets 配置与 check_fn 环境检查。',
    code: {
      file: 'model_tools.py',
      lines: 'handle_function_call()',
      snippet: `for tool_call in response.tool_calls:
    result = handle_function_call(
        tool_call.name, tool_call.args, task_id)
    messages.append(tool_result_message(result))
api_call_count += 1`,
      note: '所有 handler 必须返回 JSON 字符串',
    },
    events: [
      { name: 'pre_tool_call', desc: '插件钩子：参数审计/拦截' },
      { name: 'tool.execute', desc: 'registry 分发到 handler' },
      { name: 'post_tool_call', desc: '插件钩子：结果后处理' },
    ],
    points: [
      '工具经 tools/registry.py 自动发现（import 即注册）',
      'schema 描述不得硬编码引用其他 toolset 的工具名',
      '并行/串行由模型的一次响应中有几个 tool_calls 决定',
    ],
  },
  {
    id: 'result',
    label: 'RESULT',
    title: '结果回写消息流',
    body: '工具结果以 role="tool" 的消息追加到 messages——追加，永不改写。这是缓存友好的关键：消息流只增长。api_call_count 递增，进入下一次迭代。',
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `messages.append(tool_result_message(result))
# 消息流只 append，从不修改历史——
# 任何 in-place 修改都会让 prompt cache 整体失效`,
    },
    events: [
      { name: 'message.append', desc: 'tool 结果写入消息流' },
      { name: 'budget.tick', desc: '迭代计数与预算扣减' },
    ],
    points: [
      'tool_result_message 把 JSON 字符串包成 OpenAI tool 消息',
      '大结果会被截断/摘要以保护上下文窗口',
      '错误也被包装成结果消息，agent 能看到并自我纠正',
    ],
  },
  {
    id: 'loop',
    label: 'LOOP',
    title: '循环还是返回',
    body: '三个出口：模型返回纯文本（正常完成）；触碰 max_iterations 或预算上限（强制收尾）；_interrupt_requested（用户中断，grace call 收尾）。循环结束后，会话写入 SQLite（FTS5 可搜）， curator / memory 等后台系统才上场。',
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `while (api_call_count < self.max_iterations
       and self.iteration_budget.remaining > 0) \\
       or self._budget_grace_call:
    if self._interrupt_requested:
        break
    ...
    else:
        return response.content`,
    },
    events: [
      { name: 'session.save', desc: '会话写入 SessionDB（FTS5）' },
      { name: 'on_session_end', desc: '插件钩子：记忆同步等' },
    ],
    points: [
      '90 次迭代上限与子 agent 共享，防失控',
      '会话落盘 hermes_state.py（SessionDB），支撑跨会话搜索',
      'cron 会话有 3 分钟硬中断——调度器不被单个任务拖死',
    ],
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const AGENT_LOOP_INTRO_EN =
  'The heart of Hermes is a synchronous while loop inside AIAgent.run_conversation() in run_agent.py: ' +
  'assemble messages → call the model → execute any tool calls and append the results → call the model again, ' +
  'until the model returns plain text or hits a budget limit. ' +
  'Click the six steps below to see the real source code and event flow behind each one.';

export const LOOP_STEPS_EN: LoopStep[] = [
  {
    id: 'input',
    label: 'INPUT',
    title: 'Input enters run_conversation()',
    body: 'User messages enter the loop in OpenAI message format. There are two entry points: chat(message) returns only the final text; run_conversation() returns the full dict (final_response + messages). At the top of every iteration the loop checks the interrupt flag — pressing Esc in the CLI yanks the agent back out of the loop.',
    code: {
      file: 'run_agent.py',
      lines: 'run_conversation()',
      snippet: `def run_conversation(self, user_message, system_message=None,
                     conversation_history=None, task_id=None) -> dict:
    messages = self._build_messages(user_message, system_message,
                                    conversation_history)
    while (api_call_count < self.max_iterations
           and self.iteration_budget.remaining > 0) \\
           or self._budget_grace_call:
        if self._interrupt_requested:
            break`,
      note: 'Messages follow the OpenAI format: {"role": "system/user/assistant/tool", ...}',
    },
    events: [
      { name: 'user.message', desc: 'User input enters the session' },
      {
        name: 'interrupt.check',
        desc: 'Checks _interrupt_requested at the top of every iteration',
      },
    ],
    points: [
      'max_iterations defaults to 90 (shared with subagents)',
      'iteration_budget and the "one-turn grace call": one last chance even after the budget runs out',
      'Interrupts are not exceptions — they are part of the loop condition',
    ],
  },
  {
    id: 'context',
    label: 'CONTEXT',
    title: 'Context assembly (the cache is sacred)',
    body: "System prompt + tool schemas + history are assembled into the messages array. Hermes' first design constraint is per-conversation prompt caching: every turn of a long conversation reuses the cached prefix, so the loop never changes the toolset or rebuilds the system prompt mid-conversation — the only exception is context compression. Skill slash commands are injected as user messages rather than system prompts for the same reason: never break the cache.",
    code: {
      file: 'agent/skill_commands.py',
      lines: 'AGENTS.md §CLI Architecture',
      snippet: `# 技能命令以 user 消息注入，而不是改写 system prompt——
# 任何中途改写 past context 的行为都会让缓存失效、成本翻倍。
# 「Do NOT: alter past context / change toolsets /
#  reload memories / rebuild system prompts mid-conversation」`,
      note: 'The only allowed context change: context compression',
    },
    events: [
      { name: 'context.build', desc: 'Assemble system + tools + history (only at session start)' },
      { name: 'cache.hit', desc: 'Later turns reuse the cached prefix' },
    ],
    points: [
      'Tool schemas are sent along with messages: tool_schemas',
      'Reasoning content lives in assistant_msg["reasoning"]',
      'Skill/tool changes take effect "next session" by default; --now busts the cache immediately',
    ],
  },
  {
    id: 'model',
    label: 'MODEL',
    title: 'Call the model',
    body: 'A synchronous chat.completions.create call — no streaming complexity in the main loop (streaming is handled at the display layer). The model returns one of two things: tool_calls (keep looping) or plain text content (end the loop). The provider adapter layer unifies different backends into this single shape.',
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `response = client.chat.completions.create(
    model=model, messages=messages, tools=tool_schemas)
if response.tool_calls:
    ...  # 执行工具，继续循环
else:
    return response.content  # 最终回答`,
    },
    events: [
      { name: 'pre_llm_call', desc: 'Plugin hook: before the call (audit/rewrite allowed)' },
      { name: 'post_llm_call', desc: 'Plugin hook: after the call' },
    ],
    points: [
      'pre/post_llm_call are plugin lifecycle hooks',
      'Provider plugins unify openrouter / anthropic / gmi etc. behind one interface',
      'fallback_model and the credential pool handle single points of failure',
    ],
  },
  {
    id: 'tool',
    label: 'TOOL',
    title: 'Tool call dispatch',
    body: 'Each tool_call goes to handle_function_call(name, args, task_id): registry lookup, beforeToolCall hook, handler execution, error wrapping, and a JSON string result. Agent-level tools like todo / memory are intercepted by run_agent.py before they ever reach handle_function_call. Whether a tool is available depends on the toolsets configuration and check_fn environment checks.',
    code: {
      file: 'model_tools.py',
      lines: 'handle_function_call()',
      snippet: `for tool_call in response.tool_calls:
    result = handle_function_call(
        tool_call.name, tool_call.args, task_id)
    messages.append(tool_result_message(result))
api_call_count += 1`,
      note: 'Every handler must return a JSON string',
    },
    events: [
      { name: 'pre_tool_call', desc: 'Plugin hook: argument audit/interception' },
      { name: 'tool.execute', desc: 'Registry dispatches to the handler' },
      { name: 'post_tool_call', desc: 'Plugin hook: result post-processing' },
    ],
    points: [
      'Tools are auto-discovered via tools/registry.py (import registers them)',
      'Schema descriptions must not hardcode references to tools from other toolsets',
      'Parallel vs. serial is decided by how many tool_calls a single model response contains',
    ],
  },
  {
    id: 'result',
    label: 'RESULT',
    title: 'Results written back to the message stream',
    body: 'Tool results are appended to messages as role="tool" messages — appended, never rewritten. This is the key to cache-friendliness: the message stream only grows. api_call_count increments and the next iteration begins.',
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `messages.append(tool_result_message(result))
# 消息流只 append，从不修改历史——
# 任何 in-place 修改都会让 prompt cache 整体失效`,
    },
    events: [
      { name: 'message.append', desc: 'Tool result written into the message stream' },
      { name: 'budget.tick', desc: 'Iteration counting and budget deduction' },
    ],
    points: [
      'tool_result_message wraps the JSON string into an OpenAI tool message',
      'Large results are truncated/summarized to protect the context window',
      'Errors are also wrapped as result messages, so the agent can see them and self-correct',
    ],
  },
  {
    id: 'loop',
    label: 'LOOP',
    title: 'Loop or return',
    body: 'Three exits: the model returns plain text (normal completion); max_iterations or the budget limit is hit (forced wrap-up); _interrupt_requested (user interrupt, wrapped up via the grace call). After the loop ends, the session is written to SQLite (searchable via FTS5), and only then do background systems like the curator and memory kick in.',
    code: {
      file: 'run_agent.py',
      lines: 'Agent Loop',
      snippet: `while (api_call_count < self.max_iterations
       and self.iteration_budget.remaining > 0) \\
       or self._budget_grace_call:
    if self._interrupt_requested:
        break
    ...
    else:
        return response.content`,
    },
    events: [
      { name: 'session.save', desc: 'Session written to SessionDB (FTS5)' },
      { name: 'on_session_end', desc: 'Plugin hook: memory sync, etc.' },
    ],
    points: [
      'The 90-iteration cap is shared with subagents to prevent runaway loops',
      'Sessions persist via hermes_state.py (SessionDB), powering cross-session search',
      'Cron sessions have a 3-minute hard interrupt — the scheduler never gets stuck on one task',
    ],
  },
];

// AgentLoopLab 专属 UI 文案。
export const AGENT_LOOP_UI = {
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住主循环', en: 'The agent loop in one sentence' },
  hookBody: {
    zh: 'while 预算未耗尽：response = model(messages, tools)；有 tool_calls 就执行并 append 结果继续循环，没有就 return content。——追加不改写，缓存不失效。',
    en: 'while budget remains: response = model(messages, tools); if there are tool_calls, execute them, append the results, and keep looping — otherwise return content. Append, never rewrite: the cache stays valid.',
  },
};
