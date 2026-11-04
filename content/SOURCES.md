# Hermes 教案源码核对记录

## 版本与覆盖范围

- 核对日期：2026 年 11 月 4 日，按 Asia/Shanghai 记日。
- 上游基线：[9302ba9e212c63ba24cdf1f47f26b47bcd3b042e](https://github.com/NousResearch/hermes-agent/commit/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e)，提交时间为 2026-11-03 23:28:59 UTC，即北京时间 11 月 4 日 07:28:59。通过 GitHub API 直接取得核对时的 main 头部；网页搜索缓存曾返回较早提交，未用它判定最新版本。
- 已将本地 Hermes main 从 `819cc3cbe02104c420ea32f1f1a924247d42eaf8` 快进到上述上游提交，保留原有未跟踪的 study 目录。
- 教材覆盖：检查原有 33 章的中文主讲数据、标题与简介、相关实验说明，重点阅读 MemoryLab、SkillCuratorLab、GatewayFlowLab、ToolBuilderLab 及章节渲染入口。网站包含 34 章双语正文，新增独立自我进化章节，原有章节 ID 保持稳定。
- 当前上游逐行核对集中在内置记忆、技能写入、后台复盘、策展、工具并发、模型流式调用、内置委派与安装入口。其他章节使用本地实现、项目规范和跨章一致性复核；不宣称所有平台、插件和真实运行路径已在上游逐一端到端验证。
- 已按该源码版本修订双语讲解与实验说明。文中的本机练习供学习者按条件执行，本轮没有调用真实模型、修改个人记忆或启动定时任务。
- 本轮复审继续使用上述固定版本核对接口与实验。后续上游提交需要单独复核后再升级教程基线。

以下链接固定到同一提交，避免随 main 更新改变行号。段落说明采用原创归纳，代码链接用于核对机制。

## S1 内置记忆与工具接口

- [tools/memory_tool.py 第 398 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool.py#L398)：模型接口要求顶层 `target` 与 `operations`；单条修改使用只有一项的数组，动作是 add、patch 或 remove。顶层 action 仅由后端兼容旧调用。
- [tools/memory_tool_store.py 第 223 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool_store.py#L223)：定位 `load_from_disk`。
- [tools/memory_tool_store.py 第 429 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool_store.py#L429)：定位 `patch`。
- [tools/memory_tool_store.py 第 562 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool_store.py#L562)：定位 `apply_batch`。
- [website/docs/user-guide/features/memory.md 第 90 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/memory.md#L90)：定位 `## Memory Tool Actions`。
  核对结论：内置两份文件使用会话初始快照；写入不重建主会话快照。当前 patch 保留未匹配部分，定位歧义会报错；容量按条目与分隔符的实际字符计算，批次在最终状态检查。

## S2 记忆与技能的职责划分

- [skills.md 第 117 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/skills.md#L117)：`/learn` 从明确来源整理技能，不等同于模型训练。

- [agent/prompt_builder.py 第 195 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/prompt_builder.py#L195)：定位 `build_memory_guidance`。
- [agent/background_review.py 第 401 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/background_review.py#L401)：定位 `_LESSON_LAYER_BLOCK =`。
- [tools/skill_manager_tool.py 第 468 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_manager_tool.py#L468)：定位 `_create_skill`。
- [tools/skill_manager_tool.py 第 746 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_manager_tool.py#L746)：定位 `_record_success`。
- [skills/AGENTS.md 第 24 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/skills/AGENTS.md#L24)：定位 `## Authoring standards`。
  核对结论：每次会话都适用的稳定事实才占用内置记忆；任务步骤与该类任务的修正规则写进技能。贡献规范和运行时校验需分开说明。前台创建与后台创建的托管标记不同。

## S3 后台复盘

- [agent/background_review.py 第 979 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/background_review.py#L979)：定位 `build_cache_parity_fork`。
- [agent/background_review.py 第 1102 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/background_review.py#L1102)：定位 `_review_tool_whitelist`。
- [agent/background_review.py 第 228 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/background_review.py#L228)：定位 `load_background_review_settings`。
- [agent/background_review.py 第 431 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/background_review.py#L431)：定位 `_DO_NOT_CAPTURE_BLOCK =`。
  核对结论：使用独立运行状态与对话快照，复用同模型前缀时保留相应请求条件，执行侧另有白名单。自动复盘有开关，有限运行与特定工作路径可能不启用。没有有效方案的失败过程不应写成可靠操作指南。

## S4 复盘触发时机

- [agent/agent_init.py 第 1215 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/agent_init.py#L1215)：定位 `agent._memory_nudge_interval = 10`。
- [agent/agent_init.py 第 1286 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/agent_init.py#L1286)：定位 `agent._skill_nudge_interval = 10`。
- [agent/turn_context.py 第 765 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_context.py#L765)：定位 `_tick_memory_nudge`。
- [agent/turn_iteration_prep.py 第 165 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_iteration_prep.py#L165)：定位 `# Tool-calling iterations`。
- [agent/turn_finalizer.py 第 591 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_finalizer.py#L591)：定位 `_mirror_turn_to_memory`。
- [agent/turn_finalizer.py 第 862 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_finalizer.py#L862)：定位 `# Skill trigger is checked NOW`。
  核对结论：记忆按用户回合计数，技能按工具调用迭代计数；默认相关间隔为 10。达到阈值只是触发条件的一部分，不等于每十条消息必定保存一次，也不是每轮强制创建技能。

## S5 技能策展与托管政策

- [agent/curator.py 第 32 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/curator.py#L32)：定位 `DEFAULT_STALE_AFTER_DAYS`。
- [agent/curator.py 第 209 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/curator.py#L209)：定位 `apply_automatic_transitions`。
- [tools/skill_usage.py 第 300 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_usage.py#L300)：定位 `is_curator_managed`。
- [tools/skill_usage.py 第 522 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_usage.py#L522)：定位 `record_created`。
- [tools/skill_usage.py 第 580 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_usage.py#L580)：定位 `set_locked`。
- [website/docs/user-guide/features/curator.md 第 237 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/curator.md#L237)：定位 `### Adopting unmanaged skills`。
  核对结论：源码默认 stale 14 天、archive 30 天；检查受启用、空闲与间隔约束。consolidation 默认关闭。created_by 是托管政策标记；pin 与 lock 的保护对象不同。上游 curator 文档后部仍有 30/90 天旧例，与同文件前部及源码不一致，本稿按源码写 14/30 并保留可配置条件。

## S6 写入审批与保护范围

- [website/docs/user-guide/features/memory.md 第 329 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/memory.md#L329)：定位 `## Controlling memory writes`。
- [website/docs/user-guide/features/memory.md 第 516 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/memory.md#L516)：定位 `## Controlling skill writes`。
- [tools/skill_manager_guards.py 第 143 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_manager_guards.py#L143)：定位 `_pinned_guard`。
- [tools/skill_manager_guards.py 第 224 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_manager_guards.py#L224)：定位 `_locked_guard`。
- [website/docs/user-guide/features/memory.md 第 427 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/memory.md#L427)：定位 `### Disabling automatic reviews`。
  核对结论：staged 是待审批，不是已应用。后台无人值守的内置记忆修改或删除还受额外暂存规则限制；pin 不禁止一般内容编辑，lock 保护 skill_manage 的变更动作。锁的保证范围不等同于操作系统文件权限。

## S7 会话历史搜索

- [tools/session_search_tool.py 第 354 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/session_search_tool.py#L354)：定位 `_discover`。
- [tools/session_search_tool.py 第 447 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/session_search_tool.py#L447)：定位 `_read_session`。
- [tools/session_search_tool.py 第 531 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/session_search_tool.py#L531)：定位 `_scroll`。
- [tools/session_search_tool.py 第 434 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/session_search_tool.py#L434)：定位 `_resolve_profile_db`。
- [tools/session_search_tool.py 第 664 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/session_search_tool.py#L664)：定位 `SESSION_SEARCH_SCHEMA`。
  核对结论：搜索与读取已有会话记录，提供发现、读取、滚动与浏览形态；返回原文及元数据，搜索本身不生成 LLM 摘要。支持明确指定 profile 的读取路径，因此不能把默认分开存储写成任何方式都无法跨 profile 读取。

## S8 外部记忆接入

- [agent/memory_provider.py 第 84 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/memory_provider.py#L84)：定位 `MemoryProvider`。
- [agent/memory_manager.py 第 349 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/memory_manager.py#L349)：定位 `prefetch_all`。
- [agent/memory_manager.py 第 444 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/memory_manager.py#L444)：定位 `sync_all`。
- [agent/turn_context.py 第 986 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_context.py#L986)：定位 `ext_prefetch_cache =`。
- [agent/turn_finalizer.py 第 591 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_finalizer.py#L591)：定位 `_mirror_turn_to_memory`。
  核对结论：接口提供静态提示块、prefetch、回合同步和生命周期回调；turn_context 准备用户回合的召回，turn_finalizer 安排回合同步。on_session_end 与普通逐回合同步不是同一个时机。插件实现各自决定检索与存储机制。

## S9 工具并发与消息配对

- [agent/tool_dispatch_helpers.py 第 212 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/tool_dispatch_helpers.py#L212)：定位 `_plan_tool_batch_segments`。
- [agent/tool_executor.py 第 1577 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/tool_executor.py#L1577)：定位 `execute_tool_calls_concurrent`。
- [agent/tool_executor.py 第 1927 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/tool_executor.py#L1927)：定位 `execute_tool_calls_segmented`。
  核对结论：同批工具可拆为有序并行段与串行段；路径重叠涉及写入时形成屏障。并行执行结果按原调用顺序收集，不能将同步主控制流写成没有工具并发，也不能禁止合法的连续 tool 结果。

## S10 模型流式请求

- [agent/turn_api_call.py 第 46 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_api_call.py#L46)：定位 `_should_stream`。
- [agent/turn_api_call.py 第 72 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_api_call.py#L72)：定位 `perform_api_call`。
- [agent/chat_completion_stream_monitor.py 第 25 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/chat_completion_stream_monitor.py#L25)：定位 `class`。
  核对结论：Python 请求执行层主动选择并处理 streaming，且有存活监测与取消处理；不只是界面把一次完整文本慢慢显示。provider 的具体支持和显式禁用仍影响选择。

## S11 内置委派的执行边界

- [tools/delegate_tool_dispatch.py 第 122 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/delegate_tool_dispatch.py#L122)：定位 `_run_children_parallel`。
- [tools/delegate_tool_dispatch.py 第 432 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/delegate_tool_dispatch.py#L432)：定位 `_dispatch_background`。
  核对结论：内置子 agent 批次可使用 DaemonThreadPoolExecutor；异步交付不可用或容量到限时存在同步回退。独立上下文和终端会话不构成独立文件系统，也不代表所有可选委派后端都使用同一进程模型。

## S12 工具注册与暴露

- [tools/registry.py 第 121 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/registry.py#L121)：定位 `discover_builtin_tools`。
- [tools/registry.py 第 595 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/registry.py#L595)：定位 `register`。
- [agent/background_review.py 第 968 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/background_review.py#L968)：定位 `_inherit_parent_tool_surface`。
  核对结论：发现、注册、工具面选择与执行许可应分开讲解。已注册不等于当前模型可见；广告在 schema 中的工具也不等于某条后台路径获准执行。已启用插件同样可能产生工具定义输入成本。

## S13 安装与平台入口

- [website/docs/getting-started/installation.md 第 22 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/getting-started/installation.md#L22)：定位 `### Desktop packages`。
- [website/docs/getting-started/installation.md 第 52 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/getting-started/installation.md#L52)：定位 `#### Linux`。
- [website/docs/getting-started/installation.md 第 57 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/getting-started/installation.md#L57)：定位 `#### Windows`。
- [website/docs/getting-started/installation.md 第 69 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/getting-started/installation.md#L69)：定位 `### Android`。
- [website/docs/getting-started/installation.md 第 131 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/getting-started/installation.md#L131)：定位 `### After Installation`。

核对结论：Desktop、POSIX、原生 Windows 与 Termux 有不同入口；Termux 指向独立 APT 指南。源码安装由 PM 管理运行依赖；首轮对话需要先配置模型与认证。不同发布渠道可能与本稿 main 基线不同。

## S14 互操作与源码路径

本地教材的 `src/data/chapters.ts` 中 sourceFiles 经存在性核验，发现 `plugin-catalog/mcp-serve.yaml` 已不存在。Hermes 内部界面协议定位于本地 `tui_gateway/contracts/`、`apps/shared/`；MCP 客户端为 `tools/mcp_tool*.py`；ACP 为 `acp_adapter/`；A2A 的本地实现位于 `plugins/platforms/a2a/`。本轮核对的是协议职责与引用失效，不把旧插件安装命令重新包装成已验证的新入口。

扩展顺序以本地根 `AGENTS.md` 的 Footprint Ladder 为准：先扩展已有代码，再考虑 CLI 加技能、服务门控工具、插件、MCP，新增核心工具是最后选择。MCP 的服务内部可调用 agent，不能从协议角色推出“server 内绝无 agent”。

## S15 复审中修正的实验契约

- [agent/agent_init.py 第 1234 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/agent_init.py#L1234) 和 [agent/system_prompt.py 第 522 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/system_prompt.py#L522) 表明，cron 的两份内置记忆分别受 `memory.memory_enabled` 与 `memory.user_profile_enabled` 控制。工具集合控制模型能调用的工具，文件载入由这些配置决定。
- [tools/write_approval.py 第 74 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/write_approval.py#L74) 按独立 ID 保存提案。模拟器中的直接保存保留此前的待审批项，审批后再移除该项。
- [tools/kanban_tools.py 第 1260 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/kanban_tools.py#L1260) 规定解阻属于协调者操作。有未完成父任务时，卡片先回到 todo，依赖满足后才能就绪。
- [batch_runner.py 第 359 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/batch_runner.py#L359) 将轨迹消息保存到 `conversations`。评测页面按这个实际落盘字段展示可解析的 JSON 样例。
- [toolsets.py 第 49 行](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/toolsets.py#L49) 定义每个工具组合为带有 `tools` 与 `includes` 的对象。工具生成器采用这个结构，并核对生成的 handler 与模拟返回值一致。

教学步骤还补齐学习 profile 的创建、模型配置和启动，再进入记忆练习。CSV 例子在用户明确确认适用范围后，才将缺失值规则写为同类报告的约定。技能与工具生成器核验引号、反斜杠和换行等输入的转义。

## 网站验证与真实运行边界

1. 安装、真实模型工具调用、保存与新会话读取：使用一次性学习 profile 验证，不操作日常记忆。
2. 平台消息、控制旁路、移交和语音：选择已配置的平台实测，不能由纸上时序推出全部平台均成功。
3. 插件目录、provider 模型清单、云沙箱持久化：使用时核对具体版本与配置，不固化本轮未验证的实时名单或价格。
4. 网站已同步双语元数据、交互说明与新正文。自动检查覆盖讲义加载、导航与旧进度兼容、记忆状态变化和 Markdown 渲染；另执行 lint、静态构建及浏览器界面检查。这些检查验证教程自身，不替代上述真实 Hermes 路径的实测。
