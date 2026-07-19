// 28 章元数据。每章映射 hermes-agent 真实源码路径（sourceFiles）。
// 阶段 1 仅实现 M0 四章内容，其余章节在导航中可见、内容为占位。

export type ModuleId = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export interface Chapter {
  id: string;
  number: string; // "00"–"28"
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
