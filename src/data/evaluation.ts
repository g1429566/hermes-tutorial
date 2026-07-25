// Chapter 32「批处理与 Agent 评测」数据源。
// 对齐 batch_runner.py、mini_swe_runner.py 的模块 docstring 与仓库真实文件。

export const EVALUATION_INTRO =
  '聊天窗里的 agent 是「单实例形态」。要评测它、批量用它、给它造训练数据，需要另一套基础设施：' +
  'batch_runner 并行跑整个数据集，mini_swe_runner 复用终端后端跑 SWE 任务并产出标准轨迹。' +
  '这一章看 Hermes 如何把自己变成可测量、可批量的对象。';

export interface BatchStep {
  id: string;
  label: string;
  title: string;
  body: string;
}

export const BATCH_STEPS: BatchStep[] = [
  {
    id: 'dataset',
    label: '数据集',
    title: 'JSONL 数据集加载与分批',
    body: 'batch_runner 从 JSONL 数据集读取 prompt 列表，按 --batch_size 分批。每批是一组独立任务，彼此之间不共享会话。',
  },
  {
    id: 'parallel',
    label: '并行',
    title: '多进程并行执行',
    body: '批次之间用 multiprocessing 并行跑——每个进程里是完整的 agent 主循环（和第 04 章同一个），各自带工具与终端后端。',
  },
  {
    id: 'checkpoint',
    label: '断点',
    title: '故障容错与断点续跑',
    body: '内置 checkpointing：中途进程崩溃、机器重启都不怕——加 --resume 从上次断点继续，已完成的批次不重跑。跑几千条数据集时的必备能力。',
  },
  {
    id: 'trajectory',
    label: '轨迹',
    title: '标准轨迹落盘',
    body: '每条任务产出 Hermes 格式的 trajectory：from/value 消息对（用户/助手/工具交替），工具调用以 <tool_call>/<tool_response> XML 标记——这正是 RL 训练与蒸馏的数据格式。',
  },
  {
    id: 'stats',
    label: '统计',
    title: '工具使用统计聚合',
    body: '跨所有批次聚合工具使用统计：哪些工具被调用最多、失败率如何——既是评测信号，也反哺 toolset 设计。',
  },
];

export const SWE_RUNNER = {
  title: 'mini_swe_runner：复用同套后端的 SWE 评测',
  body: 'SWE-bench 风格的软件工程评测不需要另造执行层：mini_swe_runner 直接复用 Hermes 内建终端后端（local / docker / modal，--env 选择），在 Docker 里 --image python:3.11-slim 起干净环境跑任务，输出的轨迹与 batch_runner、trajectory_compressor 完全同构——同一份数据既能评测也能进训练管道。',
  commands: [
    'python mini_swe_runner.py --task "Create a hello world script" --env local',
    'python mini_swe_runner.py --task "List files in /tmp" --env docker --image python:3.11-slim',
    'python batch_runner.py --dataset_file=data.jsonl --batch_size=10 --run_name=eval1 --resume',
  ],
};

export const TRAJECTORY_FORMAT = `# trajectory JSONL 的一行（from/value 消息对）
{"trajectory": [
  {"from": "human",  "value": "修复 login 页面的 500 错误"},
  {"from": "gpt",    "value": "<tool_call>{\\"name\\": \\"search_files\\", ...}</tool_call>"},
  {"from": "tool",   "value": "<tool_response>{\\"matches\\": [...]}</tool_response>"},
  {"from": "gpt",    "value": "已定位问题：login.py 第 42 行……"}
]}`;

export const EVAL_ECOSYSTEM: { name: string; desc: string; sourceRef: string }[] = [
  {
    name: 'batch_runner.py',
    desc: '并行批处理：数据集 → 分批 → 多进程 → 断点续跑 → 轨迹 + 工具统计',
    sourceRef: 'batch_runner.py',
  },
  {
    name: 'mini_swe_runner.py',
    desc: 'SWE 任务执行器：复用 local/docker/modal 后端，产出同构轨迹',
    sourceRef: 'mini_swe_runner.py',
  },
  {
    name: 'trajectory_compressor.py',
    desc: '轨迹压缩管道：长轨迹提炼成可训练样本',
    sourceRef: 'trajectory_compressor.py',
  },
  {
    name: 'toolset_distributions.py',
    desc: '工具集分布：--distribution 按场景换工具组合（如 image_gen）',
    sourceRef: 'toolset_distributions.py',
  },
  {
    name: 'rl / moa toolset',
    desc: 'RL 训练与 mixture-of-agents 工具集：默认关闭（_DEFAULT_OFF_TOOLSETS），按需启用',
    sourceRef: 'toolsets.py',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const EVALUATION_INTRO_EN =
  'The agent in a chat window is its “single-instance form.” To evaluate it, run it in bulk, and ' +
  'generate training data from it, you need another set of infrastructure: batch_runner runs whole ' +
  'datasets in parallel, and mini_swe_runner reuses the terminal backends to run SWE tasks and ' +
  'produce standard trajectories. This chapter shows how Hermes turns itself into something ' +
  'measurable and batchable.';

export const BATCH_STEPS_EN: BatchStep[] = [
  {
    id: 'dataset',
    label: 'Dataset',
    title: 'JSONL dataset loading and batching',
    body: 'batch_runner reads a list of prompts from a JSONL dataset and splits it into batches by --batch_size. Each batch is a set of independent tasks that share no session with one another.',
  },
  {
    id: 'parallel',
    label: 'Parallel',
    title: 'Multi-process parallel execution',
    body: 'Batches run in parallel via multiprocessing — each process hosts a complete agent loop (the same one as Chapter 04), with its own tools and terminal backend.',
  },
  {
    id: 'checkpoint',
    label: 'Checkpoint',
    title: 'Fault tolerance and resume',
    body: 'Built-in checkpointing: a crashed process or a rebooted machine is no problem — pass --resume to continue from the last checkpoint, and finished batches are never re-run. A must-have when running datasets of thousands of items.',
  },
  {
    id: 'trajectory',
    label: 'Trajectory',
    title: 'Standard trajectories on disk',
    body: 'Each task produces a Hermes-format trajectory: from/value message pairs (user / assistant / tool alternating), with tool calls marked by <tool_call>/<tool_response> XML tags — exactly the data format for RL training and distillation.',
  },
  {
    id: 'stats',
    label: 'Stats',
    title: 'Aggregated tool-use statistics',
    body: 'Tool-use statistics are aggregated across all batches: which tools get called most, and what their failure rates look like — both an evaluation signal and feedback for toolset design.',
  },
];

export const SWE_RUNNER_EN: typeof SWE_RUNNER = {
  title: 'mini_swe_runner: SWE evaluation on the same backends',
  body: 'SWE-bench-style software engineering evaluation needs no separate execution layer: mini_swe_runner directly reuses Hermes’s built-in terminal backends (local / docker / modal, chosen via --env), spins up a clean environment in Docker with --image python:3.11-slim to run tasks, and produces trajectories fully isomorphic to batch_runner and trajectory_compressor — the same data can be evaluated and fed into the training pipeline.',
  commands: [
    'python mini_swe_runner.py --task "Create a hello world script" --env local',
    'python mini_swe_runner.py --task "List files in /tmp" --env docker --image python:3.11-slim',
    'python batch_runner.py --dataset_file=data.jsonl --batch_size=10 --run_name=eval1 --resume',
  ],
};

export const TRAJECTORY_FORMAT_EN = `# One line of trajectory JSONL (from/value message pairs)
{"trajectory": [
  {"from": "human",  "value": "Fix the 500 error on the login page"},
  {"from": "gpt",    "value": "<tool_call>{\\"name\\": \\"search_files\\", ...}</tool_call>"},
  {"from": "tool",   "value": "<tool_response>{\\"matches\\": [...]}</tool_response>"},
  {"from": "gpt",    "value": "Located the issue: login.py line 42……"}
]}`;

export const EVAL_ECOSYSTEM_EN: typeof EVAL_ECOSYSTEM = [
  {
    name: 'batch_runner.py',
    desc: 'Parallel batch processing: dataset → batching → multi-process → resume → trajectories + tool stats',
    sourceRef: 'batch_runner.py',
  },
  {
    name: 'mini_swe_runner.py',
    desc: 'SWE task runner: reuses the local/docker/modal backends, produces isomorphic trajectories',
    sourceRef: 'mini_swe_runner.py',
  },
  {
    name: 'trajectory_compressor.py',
    desc: 'Trajectory compression pipeline: distills long trajectories into trainable samples',
    sourceRef: 'trajectory_compressor.py',
  },
  {
    name: 'toolset_distributions.py',
    desc: 'Toolset distributions: --distribution swaps tool combinations per scenario (e.g. image_gen)',
    sourceRef: 'toolset_distributions.py',
  },
  {
    name: 'rl / moa toolset',
    desc: 'RL training and mixture-of-agents toolsets: off by default (_DEFAULT_OFF_TOOLSETS), enabled on demand',
    sourceRef: 'toolsets.py',
  },
];

// EvaluationLab 专属 UI 文案（中英对）。
export const EVALUATION_UI = {
  pipelineKicker: { zh: '批量流水线', en: 'BATCH PIPELINE' },
  pipelineTitle: { zh: 'batch_runner 的五步', en: 'The five steps of batch_runner' },
  trajectoryKicker: { zh: '轨迹格式', en: 'TRAJECTORY FORMAT' },
  trajectoryTitle: {
    zh: '评测与训练共用的数据形状',
    en: 'One data shape shared by evaluation and training',
  },
  ecosystemKicker: { zh: '评测生态', en: 'EVAL ECOSYSTEM' },
  ecosystemTitle: { zh: '同一份轨迹，整条管道', en: 'One trajectory, the whole pipeline' },
};
