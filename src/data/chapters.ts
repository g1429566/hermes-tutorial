// 34 章元数据。每章映射 hermes-agent 真实源码路径（sourceFiles）。
// 中文为规范字段；英文展示文案在本文件末尾的 CHAPTERS_EN / MODULES_EN。

export type ModuleId = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export interface Chapter {
  id: string;
  number: string; // "00"–"33"
  title: string;
  meta: string; // "12 min" / "18 min · 进阶"
  module: ModuleId;
  kicker: string; // 小节标签
  description: string;
  sourceFiles: string[]; // 关联的 hermes-agent 源文件路径
}

export const MODULES: Record<ModuleId, { label: string; title: string }> = {
  M0: {
    label: 'M0',
    title: '上手与全景',
  },
  M1: {
    label: 'M1',
    title: '核心机制与学习',
  },
  M2: {
    label: 'M2',
    title: '协调与执行',
  },
  M3: {
    label: 'M3',
    title: '界面与扩展',
  },
  M4: {
    label: 'M4',
    title: '故障与评测',
  },
  M5: {
    label: 'M5',
    title: '综合设计与自评',
  },
};

export const MODULE_ORDER: ModuleId[] = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];

export const CHAPTERS: Chapter[] = [
  {
    id: 'start',
    number: '00',
    title: 'Hermes 怎样完成一个任务',
    meta: '5 min',
    module: 'M0',
    kicker: '上手与全景',
    description: '从读取账单、执行计算到核对结果，先理解 agent 与工具的配合。',
    sourceFiles: ['run_agent.py', 'cli.py'],
  },
  {
    id: 'install',
    number: '01',
    title: '安装与第一次对话',
    meta: '8 min',
    module: 'M0',
    kicker: '上手与全景',
    description: '按平台选择安装入口，完成模型认证、诊断和一次真实对话。',
    sourceFiles: ['scripts/install.sh', 'cli.py'],
  },
  {
    id: 'features',
    number: '02',
    title: '按任务认识能力',
    meta: '10 min',
    module: 'M0',
    kicker: '上手与全景',
    description: '用一次汇总与每天自动报告，判断任务到底需要哪些能力。',
    sourceFiles: ['README.md'],
  },
  {
    id: 'map',
    number: '03',
    title: '沿请求认识仓库',
    meta: '10 min',
    module: 'M0',
    kicker: '上手与全景',
    description: '沿用户请求走过界面、核心、工具和存储，再定位源码模块。',
    sourceFiles: ['AGENTS.md'],
  },
  {
    id: 'agent-loop',
    number: '04',
    title: 'Agent 主循环',
    meta: '18 min · 核心',
    module: 'M1',
    kicker: '核心机制与学习',
    description: '区分会话、回合与迭代，跟踪调用、结果和结束条件。',
    sourceFiles: ['run_agent.py', 'agent/conversation_loop.py'],
  },
  {
    id: 'tools',
    number: '05',
    title: '工具与工具组合',
    meta: '15 min',
    module: 'M1',
    kicker: '核心机制与学习',
    description: '分清注册、暴露与执行，判断同批工具何时可以并行。',
    sourceFiles: ['tools/', 'toolsets.py', 'model_tools.py'],
  },
  {
    id: 'skills-1',
    number: '06',
    title: '技能怎样指导工具',
    meta: '12 min',
    module: 'M1',
    kicker: '核心机制与学习',
    description: '从可重复任务理解 SKILL.md，再追踪发现、读取与工具执行。',
    sourceFiles: ['skills/', 'agent/'],
  },
  {
    id: 'memory',
    number: '07',
    title: '记忆与跨会话召回',
    meta: '24 min · 核心',
    module: 'M1',
    kicker: '核心机制与学习',
    description: '走完 USER.md 的保存与新会话读取，再区分历史搜索和外部记忆。',
    sourceFiles: [
      'tools/memory_tool.py',
      'tools/memory_tool_store.py',
      'tools/session_search_tool.py',
      'agent/memory_provider.py',
    ],
  },
  {
    id: 'evolution',
    meta: '24 min · 核心',
    kicker: '核心机制与学习',
    sourceFiles: [
      'agent/background_review.py',
      'agent/turn_finalizer.py',
      'tools/skill_manager_tool.py',
    ],
    number: '08',
    module: 'M1',
    title: '经验怎样改变下次做事',
    description: '用 CSV 缺失值的纠正说明经验如何进入技能、复用并验证。',
  },
  {
    id: 'skills-2',
    number: '09',
    title: '技能策展与保护',
    meta: '15 min',
    module: 'M1',
    kicker: '核心机制与学习',
    description: '用活动时间推演 stale 与归档，区分托管、pin、lock 和内容质量。',
    sourceFiles: ['skills/', 'agent/'],
  },
  {
    id: 'compression',
    number: '10',
    title: '上下文压缩与文件快照',
    meta: '14 min · 核心',
    module: 'M1',
    kicker: '核心机制与学习',
    description: '比较压缩、会话恢复与文件回滚各自保护的对象和边界。',
    sourceFiles: [
      'agent/context_compressor.py',
      'agent/conversation_compression.py',
      'tools/checkpoint_manager.py',
    ],
  },
  {
    id: 'profiles',
    number: '11',
    title: 'Profiles 与状态隔离',
    meta: '10 min',
    module: 'M1',
    kicker: '核心机制与学习',
    description: '通过 A→B→A 推演，理解配置、凭据、记忆和会话的作用域。',
    sourceFiles: ['hermes_constants.py'],
  },
  {
    id: 'delegation',
    number: '12',
    title: '子 agent 委派',
    meta: '14 min',
    module: 'M2',
    kicker: '协调与执行',
    description: '明确子任务、独立上下文、异步交付以及共享文件的边界。',
    sourceFiles: ['tools/delegate_tool.py', 'tools/'],
  },
  {
    id: 'gateway-1',
    number: '13',
    title: '消息平台与网关',
    meta: '12 min',
    module: 'M2',
    kicker: '协调与执行',
    description: '跟踪平台消息怎样由适配器进入同一核心，并回到正确聊天。',
    sourceFiles: ['gateway/run.py', 'gateway/platforms/', 'plugins/platforms/'],
  },
  {
    id: 'gateway-2',
    number: '14',
    title: '消息排队与会话连续性',
    meta: '12 min',
    module: 'M2',
    kicker: '协调与执行',
    description: '解释普通消息为何排队，审批和停止命令为何需要及时到达。',
    sourceFiles: ['gateway/session.py', 'gateway/platforms/', 'plugins/platforms/'],
  },
  {
    id: 'cron',
    number: '15',
    title: '定时任务怎样运行',
    meta: '12 min',
    module: 'M2',
    kicker: '协调与执行',
    description: '区分周期与一次性计划，检查时区、触发、执行和投递。',
    sourceFiles: ['cron/jobs.py', 'cron/scheduler.py'],
  },
  {
    id: 'kanban',
    number: '16',
    title: '看板怎样协调任务',
    meta: '12 min',
    module: 'M2',
    kicker: '协调与执行',
    description: '推演依赖、原子认领与失败重派，不把移动卡片当成任务完成。',
    sourceFiles: ['plugins/kanban/'],
  },
  {
    id: 'backends',
    number: '17',
    title: '命令在哪执行',
    meta: '12 min',
    module: 'M2',
    kicker: '协调与执行',
    description: '分清界面、控制进程与执行环境，检查文件可见性和持久化。',
    sourceFiles: ['tools/environments/'],
  },
  {
    id: 'tui',
    number: '18',
    title: '终端界面与后端',
    meta: '15 min',
    module: 'M3',
    kicker: '界面与扩展',
    description: '从提交、增量事件到审批响应理解 TypeScript 与 Python 的分工。',
    sourceFiles: ['ui-tui/src/', 'tui_gateway/contracts/', 'tui_gateway/server.py'],
  },
  {
    id: 'cli',
    number: '19',
    title: '命令怎样分发',
    meta: '12 min',
    module: 'M3',
    kicker: '界面与扩展',
    description: '从命令定义、别名和处理器，理解帮助、补全与行为如何一致。',
    sourceFiles: ['cli.py', 'hermes_cli/'],
  },
  {
    id: 'build-skill',
    number: '20',
    title: '写出可复用的技能',
    meta: '20 min · 实操',
    module: 'M3',
    kicker: '界面与扩展',
    description: '先写输入、步骤和验收，再组织元数据、脚本与参考资料。',
    sourceFiles: ['skills/'],
  },
  {
    id: 'build-tool',
    number: '21',
    title: '什么时候需要新工具',
    meta: '18 min · 实操',
    module: 'M3',
    kicker: '界面与扩展',
    description: '先检查已有能力，再用 schema、handler 和接入链路解释工具。',
    sourceFiles: ['tools/', 'tools/registry.py'],
  },
  {
    id: 'build-provider',
    number: '22',
    title: '接入模型 Provider',
    meta: '18 min · 实操',
    module: 'M3',
    kicker: '界面与扩展',
    description: '分别核验认证、模型目录、请求适配、流式和工具调用。',
    sourceFiles: ['providers/', 'plugins/model-providers/'],
  },
  {
    id: 'build-plugin',
    number: '23',
    title: '通过插件扩展能力',
    meta: '18 min · 实操',
    module: 'M3',
    kicker: '界面与扩展',
    description: '通过通用注册接口接入能力，明确插件契约和执行边界。',
    sourceFiles: ['plugins/'],
  },
  {
    id: 'reliability',
    number: '24',
    title: '按故障选择处理办法',
    meta: '18 min · 进阶',
    module: 'M4',
    kicker: '故障与评测',
    description: '把重试、修正参数、压缩、停止与副作用恢复对应到具体故障。',
    sourceFiles: ['run_agent.py', 'agent/'],
  },
  {
    id: 'routing',
    number: '25',
    title: '模型路由与辅助任务',
    meta: '12 min · 核心',
    module: 'M4',
    kicker: '故障与评测',
    description: '区分凭据轮换、备用模型与辅助任务选型，并核对能力差异。',
    sourceFiles: ['agent/credential_pool.py', 'agent/auxiliary_client.py'],
  },
  {
    id: 'multimodal',
    number: '26',
    title: '图片与语音怎样接入',
    meta: '12 min',
    module: 'M4',
    kicker: '故障与评测',
    description: '跟踪原生视觉、辅助分析、图像生成与 STT/TTS 的输入输出。',
    sourceFiles: ['tools/vision_tools.py', 'agent/image_gen_provider.py', 'plugins/image_gen/'],
  },
  {
    id: 'evaluation',
    number: '27',
    title: '怎样测量 Agent 是否变好',
    meta: '12 min',
    module: 'M4',
    kicker: '故障与评测',
    description: '固定任务与配置，用正确性、异常处理、时间和成本比较改进。',
    sourceFiles: ['batch_runner.py', 'mini_swe_runner.py', 'trajectory_compressor.py'],
  },
  {
    id: 'interop',
    number: '28',
    title: 'MCP ACP 与 A2A',
    meta: '14 min · 进阶',
    module: 'M4',
    kicker: '故障与评测',
    description: '先确定通信双方，再选择内部 JSON-RPC、MCP、ACP 或 A2A。',
    sourceFiles: [
      'tui_gateway/contracts/',
      'tools/mcp_tool.py',
      'acp_adapter/',
      'plugins/platforms/a2a/',
    ],
  },
  {
    id: 'design-agent',
    number: '29',
    title: '组合一套 Agent 系统',
    meta: '25 min · 综合',
    module: 'M5',
    kicker: '综合设计与自评',
    description: '从可验收的销售报告需求，组合工具、技能、记忆和调度。',
    sourceFiles: ['run_agent.py'],
  },
  {
    id: 'interview-loop',
    number: '30',
    title: '解释主循环的设计',
    meta: '15 min · 面试',
    module: 'M5',
    kicker: '综合设计与自评',
    description: '用依赖关系、消息配对、缓存与退出路径解释设计选择。',
    sourceFiles: ['run_agent.py'],
  },
  {
    id: 'interview-multi',
    number: '31',
    title: '选择多 Agent 协作方式',
    meta: '18 min · 面试',
    module: 'M5',
    kicker: '综合设计与自评',
    description: '按依赖与反馈选择协作结构，并说明增加 agent 的收益与代价。',
    sourceFiles: ['plugins/kanban/'],
  },
  {
    id: 'interview-design',
    number: '32',
    title: '写一份系统设计文档',
    meta: '20 min · 面试',
    module: 'M5',
    kicker: '综合设计与自评',
    description: '写清需求、成功路径、状态、失败恢复与评测标准。',
    sourceFiles: [],
  },
  {
    id: 'interview-checklist',
    number: '33',
    title: '用可观察表现自评',
    meta: '12 min · 面试',
    module: 'M5',
    kicker: '综合设计与自评',
    description: '用解释、过程推演和条件变化自测，定位具体理解缺口。',
    sourceFiles: [],
  },
];

export const CHAPTER_BY_ID: Map<string, Chapter> = new Map(CHAPTERS.map((c) => [c.id, c]));

export function nextChapter(id: string): Chapter | null {
  const idx = CHAPTERS.findIndex((c) => c.id === id);
  return idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
}

export function prevChapter(id: string): Chapter | null {
  const idx = CHAPTERS.findIndex((c) => c.id === id);
  return idx > 0 ? CHAPTERS[idx - 1] : null;
}

// ── 英文元数据（与 CHAPTERS 一一对应，按 id 索引） ───────────────

import type { Lang } from '@/lib/i18n';

export const MODULES_EN: Record<ModuleId, string> = {
  M0: 'Start and Explore',
  M1: 'Core Mechanisms and Learning',
  M2: 'Coordination and Execution',
  M3: 'Interfaces and Extensions',
  M4: 'Failures and Evaluation',
  M5: 'Design and Self-Assessment',
};

export interface ChapterText {
  title: string;
  kicker: string;
  description: string;
  meta: string;
}

export const CHAPTERS_EN: Record<string, ChapterText> = {
  start: {
    title: 'How Hermes completes a task',
    kicker: 'Start and explore',
    description: 'Trace reading a bill, calculating, and verifying the result.',
    meta: '5 min',
  },
  install: {
    title: 'Install and verify a first conversation',
    kicker: 'Start and explore',
    description: 'Choose the installation path, authenticate, diagnose, and verify a conversation.',
    meta: '8 min',
  },
  features: {
    title: 'Choose capabilities from the task',
    kicker: 'Start and explore',
    description: 'Compare one-off and daily reports to identify necessary capabilities.',
    meta: '10 min',
  },
  map: {
    title: 'Follow a request through the repository',
    kicker: 'Start and explore',
    description: 'Follow a request through interfaces, core, tools, and persistence.',
    meta: '10 min',
  },
  'agent-loop': {
    title: 'The agent loop',
    kicker: 'Core mechanisms and learning',
    description: 'Distinguish sessions, turns, and iterations; trace calls and results.',
    meta: '18 min · Core',
  },
  tools: {
    title: 'Tools and toolsets',
    kicker: 'Core mechanisms and learning',
    description: 'Separate registration, exposure, and execution; reason about concurrency.',
    meta: '15 min',
  },
  'skills-1': {
    title: 'How skills guide tools',
    kicker: 'Core mechanisms and learning',
    description:
      'Start with a repeatable task, then trace skill discovery, reading, and execution.',
    meta: '12 min',
  },
  memory: {
    title: 'Memory across sessions',
    kicker: 'Core mechanisms and learning',
    description:
      'Trace USER.md writes and fresh snapshots, then distinguish history and providers.',
    meta: '24 min · Core',
  },
  evolution: {
    title: 'How experience improves later work',
    kicker: 'Core mechanisms and learning',
    description: 'Follow a CSV correction into a reusable skill and evaluate its effect.',
    meta: '24 min · Core',
  },
  'skills-2': {
    title: 'Skill curation and protection',
    kicker: 'Core mechanisms and learning',
    description:
      'Trace inactivity transitions and distinguish management, pinning, locking, and quality.',
    meta: '15 min',
  },
  compression: {
    title: 'Context compression and checkpoints',
    kicker: 'Core mechanisms and learning',
    description: 'Distinguish context compression, session recovery, and file rollback.',
    meta: '14 min · Core',
  },
  profiles: {
    title: 'Profiles and state isolation',
    kicker: 'Core mechanisms and learning',
    description: 'Trace A→B→A to understand the ownership of configuration and user state.',
    meta: '10 min',
  },
  delegation: {
    title: 'Delegating to child agents',
    kicker: 'Coordination and execution',
    description:
      'Define child tasks, separate contexts, completion delivery, and shared-file limits.',
    meta: '14 min',
  },
  'gateway-1': {
    title: 'Messaging platforms and gateways',
    kicker: 'Coordination and execution',
    description: 'Trace platform messages through adapters, the core, and reply routing.',
    meta: '12 min',
  },
  'gateway-2': {
    title: 'Queues and session continuity',
    kicker: 'Coordination and execution',
    description: 'Explain follow-up queues and why controls need a timely path.',
    meta: '12 min',
  },
  cron: {
    title: 'How scheduled jobs run',
    kicker: 'Coordination and execution',
    description: 'Distinguish recurring and one-shot jobs, timezones, execution, and delivery.',
    meta: '12 min',
  },
  kanban: {
    title: 'Coordinating tasks with a board',
    kicker: 'Coordination and execution',
    description: 'Reason about dependencies, atomic claims, and retries.',
    meta: '12 min',
  },
  backends: {
    title: 'Where commands execute',
    kicker: 'Coordination and execution',
    description:
      'Locate the client, control process, and execution target; verify data visibility.',
    meta: '12 min',
  },
  tui: {
    title: 'Terminal UI and backend',
    kicker: 'Interfaces and extensions',
    description:
      'Trace submission, streaming events, and approval responses between UI and backend.',
    meta: '15 min',
  },
  cli: {
    title: 'How commands are dispatched',
    kicker: 'Interfaces and extensions',
    description: 'Connect command definitions, aliases, handlers, help, and completion.',
    meta: '12 min',
  },
  'build-skill': {
    title: 'Write a reusable skill',
    kicker: 'Interfaces and extensions',
    description: 'Specify inputs, steps, and acceptance before packaging a skill.',
    meta: '20 min · Hands-on',
  },
  'build-tool': {
    title: 'When to add a tool',
    kicker: 'Interfaces and extensions',
    description:
      'Check existing capabilities before defining a schema, handler, and integration path.',
    meta: '18 min · Hands-on',
  },
  'build-provider': {
    title: 'Integrate a model provider',
    kicker: 'Interfaces and extensions',
    description: 'Verify authentication, catalogs, API adaptation, streaming, and tool calls.',
    meta: '18 min · Hands-on',
  },
  'build-plugin': {
    title: 'Extend capabilities with plugins',
    kicker: 'Interfaces and extensions',
    description: 'Use supported registration interfaces and understand plugin contracts.',
    meta: '18 min · Hands-on',
  },
  reliability: {
    title: 'Respond to different failures',
    kicker: 'Failures and evaluation',
    description: 'Match retries, correction, compression, cancellation, and recovery to failures.',
    meta: '18 min · Advanced',
  },
  routing: {
    title: 'Model routing and auxiliary tasks',
    kicker: 'Failures and evaluation',
    description: 'Distinguish credential rotation, fallback, and auxiliary task routing.',
    meta: '12 min · Core',
  },
  multimodal: {
    title: 'Working with images and speech',
    kicker: 'Failures and evaluation',
    description: 'Trace native vision, auxiliary analysis, generation, STT, and TTS.',
    meta: '12 min',
  },
  evaluation: {
    title: 'Measure agent improvement',
    kicker: 'Failures and evaluation',
    description: 'Hold conditions fixed and measure correctness, failures, latency, and cost.',
    meta: '12 min',
  },
  interop: {
    title: 'MCP, ACP, and A2A',
    kicker: 'Failures and evaluation',
    description: 'Identify communicating endpoints before choosing a protocol.',
    meta: '14 min · Advanced',
  },
  'design-agent': {
    title: 'Design an agent from requirements',
    kicker: 'Design and self-assessment',
    description: 'Build a system from verifiable reporting requirements.',
    meta: '25 min · Capstone',
  },
  'interview-loop': {
    title: 'Explain loop design decisions',
    kicker: 'Design and self-assessment',
    description: 'Explain design through dependencies, call matching, caching, and exit paths.',
    meta: '15 min · Interview',
  },
  'interview-multi': {
    title: 'Choose a collaboration pattern',
    kicker: 'Design and self-assessment',
    description: 'Choose collaboration from dependencies and feedback, with explicit tradeoffs.',
    meta: '18 min · Interview',
  },
  'interview-design': {
    title: 'Write a system design document',
    kicker: 'Design and self-assessment',
    description: 'Document requirements, state, failure recovery, and evaluation.',
    meta: '20 min · Interview',
  },
  'interview-checklist': {
    title: 'Assess understanding through evidence',
    kicker: 'Design and self-assessment',
    description: 'Test explanations, state traces, and changed conditions to locate gaps.',
    meta: '12 min · Interview',
  },
};

// 按语言取一章的展示文案（标题 / kicker / 描述 / meta）。
export function chapterText(chapter: Chapter, lang: Lang): ChapterText {
  if (lang === 'en') return CHAPTERS_EN[chapter.id];
  return {
    title: chapter.title,
    kicker: chapter.kicker,
    description: chapter.description,
    meta: chapter.meta,
  };
}
