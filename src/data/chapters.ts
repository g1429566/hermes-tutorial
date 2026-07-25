// 33 章元数据。每章映射 hermes-agent 真实源码路径（sourceFiles）。
// 中文为规范字段；英文展示文案在本文件末尾的 CHAPTERS_EN / MODULES_EN。

export type ModuleId = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export interface Chapter {
  id: string;
  number: string; // "00"–"32"
  title: string;
  meta: string; // "12 min" / "18 min · 进阶"
  module: ModuleId;
  kicker: string; // 小节标签
  description: string;
  sourceFiles: string[]; // 关联的 hermes-agent 源文件路径
}

export const MODULES: Record<ModuleId, { label: string; title: string }> = {
  M0: { label: 'M0', title: '认识 Hermes' },
  M1: { label: 'M1', title: '深入原理' },
  M2: { label: 'M2', title: '基于原理构建' },
  M3: { label: 'M3', title: '面试冲刺' },
  M4: { label: 'M4', title: '扩展与前沿' },
  M5: { label: 'M5', title: 'Agent 核心补全' },
};

export const MODULE_ORDER: ModuleId[] = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];

export const CHAPTERS: Chapter[] = [
  // ── M0 · 认识 Hermes ─────────────────────────────────────────────
  {
    id: 'start',
    number: '00',
    title: '先建立直觉',
    meta: '5 min',
    module: 'M0',
    kicker: '直觉',
    description: '在动手之前，先通过终端动画直观感受 hermes 命令能做什么。',
    sourceFiles: ['run_agent.py', 'cli.py'],
  },
  {
    id: 'map',
    number: '01',
    title: '读懂仓库地图',
    meta: '10 min',
    module: 'M0',
    kicker: '仓库结构',
    description: '包架构浏览器：六大组成部分逐一拆解，对应真实源码路径。',
    sourceFiles: ['AGENTS.md'],
  },
  {
    id: 'features',
    number: '02',
    title: '功能全景',
    meta: '10 min',
    module: 'M0',
    kicker: '能力矩阵',
    description: '七大能力矩阵 + 场景选择器：你的使用场景会用到哪些能力。',
    sourceFiles: ['README.md'],
  },
  {
    id: 'install',
    number: '03',
    title: '安装与第一次对话',
    meta: '8 min',
    module: 'M0',
    kicker: '上手',
    description: '安装 Hermes、完成第一次对话，认识六个最常用命令。',
    sourceFiles: ['setup-hermes.sh', 'cli.py'],
  },
  // ── M1 · 深入原理 ────────────────────────────────────────────────
  {
    id: 'agent-loop',
    number: '04',
    title: 'Agent 主循环',
    meta: '18 min · 核心',
    module: 'M1',
    kicker: '主循环',
    description: 'Agent 循环步进器：INPUT→CONTEXT→MODEL→TOOL→RESULT→LOOP，逐步对照源码。',
    sourceFiles: ['run_agent.py'],
  },
  {
    id: 'skills-1',
    number: '05',
    title: '技能系统（上）',
    meta: '12 min',
    module: 'M1',
    kicker: '技能',
    description: '技能格式浏览器：YAML 结构、加载流程与 SkillManager。',
    sourceFiles: ['skills/', 'agent/'],
  },
  {
    id: 'skills-2',
    number: '06',
    title: '技能系统（下）· 策展器',
    meta: '15 min',
    module: 'M1',
    kicker: '策展器',
    description: '策展器状态机可视化：创建→匹配→调用→评价→改进/淘汰。',
    sourceFiles: ['skills/', 'agent/'],
  },
  {
    id: 'tools',
    number: '07',
    title: '工具与 toolsets',
    meta: '15 min',
    module: 'M1',
    kicker: '工具路由',
    description: '工具路由实验室：注册→校验→执行→结果流，并行/串行标志。',
    sourceFiles: ['tools/', 'toolsets.py', 'model_tools.py'],
  },
  {
    id: 'memory',
    number: '08',
    title: '记忆与跨会话召回',
    meta: '14 min',
    module: 'M1',
    kicker: '记忆',
    description: '记忆架构图：FTS5 索引 + LLM 摘要 + Honcho 用户模型 + 检索流程。',
    sourceFiles: ['hermes_state.py', 'plugins/memory/'],
  },
  {
    id: 'delegation',
    number: '09',
    title: '委派系统',
    meta: '14 min',
    module: 'M1',
    kicker: '委派',
    description: '委派时序图：spawn→task→tool_calls→result→parent 聚合。',
    sourceFiles: ['agent/', 'tools/'],
  },
  {
    id: 'gateway-1',
    number: '10',
    title: '消息网关（上）',
    meta: '12 min',
    module: 'M1',
    kicker: '网关拓扑',
    description: '网关拓扑图：Telegram/Discord/Slack/WhatsApp/Signal → gateway → agent。',
    sourceFiles: ['gateway/run.py', 'gateway/platforms/'],
  },
  {
    id: 'gateway-2',
    number: '11',
    title: '消息网关（下）',
    meta: '12 min',
    module: 'M1',
    kicker: '消息流转',
    description: '消息流转 + 语音转录 + 跨平台连续性。',
    sourceFiles: ['gateway/session.py', 'gateway/platforms/'],
  },
  {
    id: 'cron',
    number: '12',
    title: 'Cron 定时调度',
    meta: '12 min',
    module: 'M1',
    kicker: '定时任务',
    description: 'Cron 表达式实验室：可视化 cron 解析 + scheduler 调度流程。',
    sourceFiles: ['cron/jobs.py', 'cron/scheduler.py'],
  },
  {
    id: 'kanban',
    number: '13',
    title: 'Kanban 工作队列',
    meta: '12 min',
    module: 'M1',
    kicker: '多 agent 协作',
    description: 'Kanban 面板模拟：multi-agent 任务状态流转。',
    sourceFiles: ['plugins/kanban/'],
  },
  {
    id: 'tui',
    number: '14',
    title: 'TUI 架构',
    meta: '15 min',
    module: 'M1',
    kicker: '终端界面',
    description: '终端组件实验：render(width)→行、invalidate、requestRender、输入法。',
    sourceFiles: ['ui-tui/src/', 'tui_gateway/'],
  },
  {
    id: 'cli',
    number: '15',
    title: 'CLI 架构',
    meta: '12 min',
    module: 'M1',
    kicker: '命令行',
    description: 'CLI 命令树 + 参数解析 + 子命令路由。',
    sourceFiles: ['cli.py', 'hermes_cli/'],
  },
  {
    id: 'backends',
    number: '16',
    title: '终端后端',
    meta: '12 min',
    module: 'M1',
    kicker: '执行环境',
    description:
      '6 种后端对比：local/Docker/SSH/Singularity/Modal/Daytona + serverless 休眠/唤醒。',
    sourceFiles: ['tools/environments/'],
  },
  {
    id: 'profiles',
    number: '17',
    title: 'Profiles 多实例',
    meta: '10 min',
    module: 'M1',
    kicker: '多实例',
    description: '配置文件结构 + 实例隔离模型。',
    sourceFiles: ['hermes_constants.py'],
  },
  // ── M2 · 基于原理构建 ────────────────────────────────────────────
  {
    id: 'build-skill',
    number: '18',
    title: '写一个新技能',
    meta: '20 min · 实操',
    module: 'M2',
    kicker: '构建',
    description: '技能构建器：YAML 编辑器 + 字段校验 + 预期效果预览。',
    sourceFiles: ['skills/'],
  },
  {
    id: 'build-tool',
    number: '19',
    title: '加一个新工具',
    meta: '18 min · 实操',
    module: 'M2',
    kicker: '构建',
    description: '工具注册实验：schema 定义→注册→模拟调用→校验结果。',
    sourceFiles: ['tools/', 'tools/registry.py'],
  },
  {
    id: 'build-provider',
    number: '20',
    title: '加一个 Provider',
    meta: '18 min · 实操',
    module: 'M2',
    kicker: '构建',
    description: 'Provider 适配实验：auth→models→streamSimple→统一事件流。',
    sourceFiles: ['providers/', 'plugins/model-providers/'],
  },
  {
    id: 'build-plugin',
    number: '21',
    title: '写一个 Plugin',
    meta: '18 min · 实操',
    module: 'M2',
    kicker: '构建',
    description: 'Plugin 构建器：扩展点选择→事件绑定→模拟加载。',
    sourceFiles: ['plugins/'],
  },
  {
    id: 'design-agent',
    number: '22',
    title: '从零设计一个新 Agent',
    meta: '25 min · 综合',
    module: 'M2',
    kicker: '综合设计',
    description: 'Agent 设计工作台：loop→tools→memory→skills→deploy 完整设计卡片。',
    sourceFiles: ['run_agent.py'],
  },
  // ── M3 · 面试冲刺 ────────────────────────────────────────────────
  {
    id: 'interview-loop',
    number: '23',
    title: 'Agent 循环设计题',
    meta: '15 min · 面试',
    module: 'M3',
    kicker: '面试题',
    description: '面试问答卡：问题 + 翻转思路 + 追问链。',
    sourceFiles: ['run_agent.py'],
  },
  {
    id: 'interview-multi',
    number: '24',
    title: '多 Agent 协作设计题',
    meta: '18 min · 面试',
    module: 'M3',
    kicker: '面试题',
    description: '拓扑选择器：Manager/Handoff/Supervisor/Group/Swarm 五种模式对比。',
    sourceFiles: ['plugins/kanban/'],
  },
  {
    id: 'interview-design',
    number: '25',
    title: '系统设计面试',
    meta: '20 min · 面试',
    module: 'M3',
    kicker: '面试题',
    description: 'Design Doc 模板：需求→架构→组件→数据→故障→评测。',
    sourceFiles: [],
  },
  {
    id: 'interview-checklist',
    number: '26',
    title: '自我评估与面试清单',
    meta: '12 min · 面试',
    module: 'M3',
    kicker: '自评',
    description: '自评矩阵：「能讲清 / 能设计 / 能答追问」三档 + 知识图谱。',
    sourceFiles: [],
  },
  // ── M4 · 扩展与前沿 ──────────────────────────────────────────────
  {
    id: 'reliability',
    number: '27',
    title: '可靠性设计',
    meta: '18 min · 进阶',
    module: 'M4',
    kicker: '可靠性',
    description: '故障注入实验室：429/溢出/abort/部分失败，重试→熔断→补偿→审计。',
    sourceFiles: ['run_agent.py', 'agent/'],
  },
  {
    id: 'interop',
    number: '28',
    title: 'MCP / A2A 互操作',
    meta: '14 min · 进阶',
    module: 'M4',
    kicker: '互操作',
    description: '协议对比面板：Pi RPC ↔ MCP ↔ A2A / 参与方 / 传递内容 / 何时用。',
    sourceFiles: ['mcp_serve.py', 'acp_adapter/', 'acp_registry/'],
  },
  // ── M5 · Agent 核心补全 ──────────────────────────────────────────
  {
    id: 'compression',
    number: '29',
    title: '上下文压缩与 Checkpoint',
    meta: '14 min · 核心',
    module: 'M5',
    kicker: '上下文管理',
    description: '唯一被允许的上下文变更：压缩流程拆解 + 改文件前的隐形快照。',
    sourceFiles: [
      'agent/context_compressor.py',
      'agent/conversation_compression.py',
      'tools/checkpoint_manager.py',
    ],
  },
  {
    id: 'routing',
    number: '30',
    title: '模型路由与凭据池',
    meta: '12 min · 核心',
    module: 'M5',
    kicker: '降级与路由',
    description: '主模型挂了谁接盘：凭据池、fallback_model、辅助任务统一路由链。',
    sourceFiles: ['agent/credential_pool.py', 'agent/auxiliary_client.py'],
  },
  {
    id: 'multimodal',
    number: '31',
    title: '多模态工具',
    meta: '12 min',
    module: 'M5',
    kicker: '感知力',
    description: '视觉理解、图像/视频生成、TTS/STT：多模态如何以工具与 provider 插件长在边缘。',
    sourceFiles: ['tools/vision_tools.py', 'agent/image_gen_provider.py', 'plugins/image_gen/'],
  },
  {
    id: 'evaluation',
    number: '32',
    title: '批处理与 Agent 评测',
    meta: '12 min',
    module: 'M5',
    kicker: '可测量',
    description: 'batch_runner 并行数据集、断点续跑、标准轨迹格式与 SWE 评测管道。',
    sourceFiles: ['batch_runner.py', 'mini_swe_runner.py', 'trajectory_compressor.py'],
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
  M0: 'Meet Hermes',
  M1: 'Under the Hood',
  M2: 'Build on the Principles',
  M3: 'Interview Sprint',
  M4: 'Extensions & Frontiers',
  M5: 'Agent Core Completion',
};

export interface ChapterText {
  title: string;
  kicker: string;
  description: string;
  meta: string;
}

export const CHAPTERS_EN: Record<string, ChapterText> = {
  start: {
    title: 'Build Intuition First',
    kicker: 'Intuition',
    description:
      'Before touching anything, get a feel for what the hermes command can do via a terminal animation.',
    meta: '5 min',
  },
  map: {
    title: 'Read the Repo Map',
    kicker: 'Repo structure',
    description:
      'Package architecture explorer: six building blocks, each mapped to real source paths.',
    meta: '10 min',
  },
  features: {
    title: 'Feature Panorama',
    kicker: 'Capability matrix',
    description:
      'Seven-capability matrix + scenario picker: which capabilities your use case actually exercises.',
    meta: '10 min',
  },
  install: {
    title: 'Install & First Conversation',
    kicker: 'Getting started',
    description: 'Install Hermes, hold your first conversation, meet the six most-used commands.',
    meta: '8 min',
  },
  'agent-loop': {
    title: 'The Agent Loop',
    kicker: 'Main loop',
    description:
      'Agent loop stepper: INPUT→CONTEXT→MODEL→TOOL→RESULT→LOOP, checked against the source step by step.',
    meta: '18 min · Core',
  },
  'skills-1': {
    title: 'The Skill System (I)',
    kicker: 'Skills',
    description: 'Skill format explorer: YAML structure, loading pipeline, and the SkillManager.',
    meta: '12 min',
  },
  'skills-2': {
    title: 'The Skill System (II) · Curator',
    kicker: 'Curator',
    description: 'Curator state machine visualized: create→match→invoke→evaluate→improve/retire.',
    meta: '15 min',
  },
  tools: {
    title: 'Tools & Toolsets',
    kicker: 'Tool routing',
    description:
      'Tool routing lab: register→validate→execute→result stream, with parallel/serial flags.',
    meta: '15 min',
  },
  memory: {
    title: 'Memory & Cross-Session Recall',
    kicker: 'Memory',
    description:
      'Memory architecture: FTS5 index + LLM summaries + Honcho user model + retrieval pipeline.',
    meta: '14 min',
  },
  delegation: {
    title: 'The Delegation System',
    kicker: 'Delegation',
    description: 'Delegation sequence diagram: spawn→task→tool_calls→result→parent aggregation.',
    meta: '14 min',
  },
  'gateway-1': {
    title: 'Message Gateway (I)',
    kicker: 'Gateway topology',
    description: 'Gateway topology: Telegram/Discord/Slack/WhatsApp/Signal → gateway → agent.',
    meta: '12 min',
  },
  'gateway-2': {
    title: 'Message Gateway (II)',
    kicker: 'Message flow',
    description: 'Message flow + voice transcription + cross-platform continuity.',
    meta: '12 min',
  },
  cron: {
    title: 'Cron Scheduling',
    kicker: 'Scheduled jobs',
    description: 'Cron expression lab: visual cron parsing + the scheduler dispatch pipeline.',
    meta: '12 min',
  },
  kanban: {
    title: 'The Kanban Work Queue',
    kicker: 'Multi-agent collaboration',
    description: 'Kanban board simulation: multi-agent task state transitions.',
    meta: '12 min',
  },
  tui: {
    title: 'TUI Architecture',
    kicker: 'Terminal UI',
    description:
      'Terminal component lab: render(width)→lines, invalidate, requestRender, input methods.',
    meta: '15 min',
  },
  cli: {
    title: 'CLI Architecture',
    kicker: 'Command line',
    description: 'CLI command tree + argument parsing + subcommand routing.',
    meta: '12 min',
  },
  backends: {
    title: 'Terminal Backends',
    kicker: 'Execution environments',
    description:
      'Six backends compared: local/Docker/SSH/Singularity/Modal/Daytona + serverless sleep/wake.',
    meta: '12 min',
  },
  profiles: {
    title: 'Profiles & Multi-Instance',
    kicker: 'Multi-instance',
    description: 'Profile file structure + the instance isolation model.',
    meta: '10 min',
  },
  'build-skill': {
    title: 'Write a New Skill',
    kicker: 'Build',
    description: 'Skill builder: YAML editor + field validation + expected-effect preview.',
    meta: '20 min · Hands-on',
  },
  'build-tool': {
    title: 'Add a New Tool',
    kicker: 'Build',
    description: 'Tool registration lab: schema definition→register→simulated call→validation.',
    meta: '18 min · Hands-on',
  },
  'build-provider': {
    title: 'Add a Provider',
    kicker: 'Build',
    description: 'Provider adapter lab: auth→models→streamSimple→unified event stream.',
    meta: '18 min · Hands-on',
  },
  'build-plugin': {
    title: 'Write a Plugin',
    kicker: 'Build',
    description: 'Plugin builder: extension-point selection→event binding→simulated load.',
    meta: '18 min · Hands-on',
  },
  'design-agent': {
    title: 'Design a New Agent from Scratch',
    kicker: 'Capstone design',
    description:
      'Agent design workbench: a complete design card spanning loop→tools→memory→skills→deploy.',
    meta: '25 min · Capstone',
  },
  'interview-loop': {
    title: 'Interview: Agent Loop Design',
    kicker: 'Interview',
    description: 'Interview flashcards: question + flip-for-approach + follow-up chains.',
    meta: '15 min · Interview',
  },
  'interview-multi': {
    title: 'Interview: Multi-Agent Design',
    kicker: 'Interview',
    description:
      'Topology picker: Manager/Handoff/Supervisor/Group/Swarm — five patterns compared.',
    meta: '18 min · Interview',
  },
  'interview-design': {
    title: 'System Design Interview',
    kicker: 'Interview',
    description: 'Design doc template: requirements→architecture→components→data→failure→eval.',
    meta: '20 min · Interview',
  },
  'interview-checklist': {
    title: 'Self-Assessment & Interview Checklist',
    kicker: 'Self-assessment',
    description:
      'Self-assessment matrix: "can explain / can design / can handle follow-ups" + knowledge graph.',
    meta: '12 min · Interview',
  },
  reliability: {
    title: 'Reliability Design',
    kicker: 'Reliability',
    description:
      'Fault-injection lab: 429/overflow/abort/partial failure — retry→circuit-break→compensate→audit.',
    meta: '18 min · Advanced',
  },
  interop: {
    title: 'MCP / A2A Interop',
    kicker: 'Interop',
    description:
      'Protocol comparison panel: Pi RPC ↔ MCP ↔ A2A / participants / payloads / when to use.',
    meta: '14 min · Advanced',
  },
  compression: {
    title: 'Context Compression & Checkpoints',
    kicker: 'Context management',
    description:
      'The only sanctioned mid-conversation context change: compression pipeline + invisible snapshots before file edits.',
    meta: '14 min · Core',
  },
  routing: {
    title: 'Model Routing & Credential Pool',
    kicker: 'Fallback & routing',
    description:
      'When the primary model dies, who picks up: credential pool, fallback_model, and the unified routing chain for auxiliary tasks.',
    meta: '12 min · Core',
  },
  multimodal: {
    title: 'Multimodal Tools',
    kicker: 'Perception',
    description:
      'Vision understanding, image/video generation, TTS/STT: how multimodality grows at the edges as tools and provider plugins.',
    meta: '12 min',
  },
  evaluation: {
    title: 'Batch Runs & Agent Evaluation',
    kicker: 'Measurability',
    description:
      'batch_runner parallel datasets, resumable runs, the standard trajectory format, and the SWE eval pipeline.',
    meta: '12 min',
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
