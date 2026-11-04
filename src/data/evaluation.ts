// Chapter 27「批处理与 Agent 评测」数据源。
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
    body: '按执行器保存的进度恢复；外部副作用与完成记录之间崩溃，仍需幂等或状态核对。',
  },
  {
    id: 'trajectory',
    label: '轨迹',
    title: '标准轨迹落盘',
    body: '保存成功的轨迹记录包含 conversations 数组。其中每条消息用 from 标明来源，用 value 保存内容。工具请求和结果分别位于 <tool_call> 与 <tool_response> 标记中。下方展开了一条 JSONL 记录中的部分字段，实际文件每行存放一条完整的 JSON 记录。',
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
  body: 'SWE-bench 风格的软件工程评测不需要另造执行层：mini_swe_runner 直接复用 Hermes 内建终端后端（local / docker / modal，--env 选择），在 Docker 里 --image python:3.11-slim 起干净环境跑任务，输出的轨迹与 batch_runner、trajectory_compressor 可供相应分析或转换路径使用——同一份数据既能评测也能进训练管道。',
  commands: [
    'python mini_swe_runner.py --task "Create a hello world script" --env local',
    'python mini_swe_runner.py --task "List files in /tmp" --env docker --image python:3.11-slim',
    'python batch_runner.py --dataset_file=data.jsonl --batch_size=10 --run_name=eval1 --resume',
  ],
};

function trajectoryExample(prompt: string, reply: string) {
  return JSON.stringify(
    {
      conversations: [
        { from: 'human', value: prompt },
        {
          from: 'gpt',
          value:
            '<think>\n</think>\n<tool_call>\n{"name":"read_file","arguments":{"path":"note.txt"}}\n</tool_call>',
        },
        {
          from: 'tool',
          value:
            '<tool_response>\n{"tool_call_id":"call_1","name":"read_file","content":{"content":"1|OK"}}\n</tool_response>',
        },
        { from: 'gpt', value: `<think>\n</think>\n${reply}` },
      ],
      completed: true,
    },
    null,
    2,
  );
}

export const TRAJECTORY_FORMAT = trajectoryExample(
  '读出 note.txt 中的文字。',
  '文件中的文字是 OK。',
);

export const EVAL_ECOSYSTEM: { name: string; desc: string; sourceRef: string }[] = [
  {
    name: 'batch_runner.py',
    desc: '并行批处理：数据集 → 分批 → 多进程 → 断点续跑 → 轨迹 + 工具统计',
    sourceRef: 'batch_runner.py',
  },
  {
    name: 'mini_swe_runner.py',
    desc: 'SWE 任务执行器：复用 local/docker/modal 后端，记录对话与任务元数据',
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
    name: 'evals/',
    desc: '仓库内置离线基准：codebase_navigability、compaction 等可重复评测',
    sourceRef: 'evals/',
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
    body: 'Resume uses saved progress according to the runner. A crash between an external effect and its completion record still needs idempotence or verification.',
  },
  {
    id: 'trajectory',
    label: 'Trajectory',
    title: 'Standard trajectories on disk',
    body: 'A saved trajectory record contains a conversations array. Each message has a from field for its source and a value field for its content. Tool requests and results appear inside <tool_call> and <tool_response> tags. The example expands selected fields for readability. The JSONL file stores one complete JSON record per line.',
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
  body: 'SWE-bench-style software engineering evaluation needs no separate execution layer: mini_swe_runner directly reuses Hermes’s built-in terminal backends (local / docker / modal, chosen via --env), spins up a clean environment in Docker with --image python:3.11-slim to run tasks, and writes results with conversations and task metadata. Check the fields expected by each downstream evaluator or training pipeline.',
  commands: [
    'python mini_swe_runner.py --task "Create a hello world script" --env local',
    'python mini_swe_runner.py --task "List files in /tmp" --env docker --image python:3.11-slim',
    'python batch_runner.py --dataset_file=data.jsonl --batch_size=10 --run_name=eval1 --resume',
  ],
};

export const TRAJECTORY_FORMAT_EN = trajectoryExample(
  'Read the text in note.txt.',
  'The file contains OK.',
);

export const EVAL_ECOSYSTEM_EN: typeof EVAL_ECOSYSTEM = [
  {
    name: 'batch_runner.py',
    desc: 'Parallel batch processing: dataset → batching → multi-process → resume → trajectories + tool stats',
    sourceRef: 'batch_runner.py',
  },
  {
    name: 'mini_swe_runner.py',
    desc: 'SWE task runner: reuses the local/docker/modal backends, writes conversation records with task metadata',
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
    name: 'evals/',
    desc: 'In-repo offline benchmarks: reproducible evals like codebase_navigability and compaction',
    sourceRef: 'evals/',
  },
];

// EvaluationLab 专属 UI 文案（中英对）。
export const EVALUATION_UI = {
  pipelineKicker: { zh: '批量流水线', en: 'BATCH PIPELINE' },
  pipelineTitle: { zh: 'batch_runner 的五步', en: 'The five steps of batch_runner' },
  trajectoryKicker: { zh: '轨迹格式', en: 'TRAJECTORY FORMAT' },
  trajectoryTitle: {
    zh: '一条 JSONL 记录的节选（展开显示）',
    en: 'Selected fields from one JSONL record, expanded for reading',
  },
  ecosystemKicker: { zh: '评测生态', en: 'EVAL ECOSYSTEM' },
  ecosystemTitle: { zh: '同一份轨迹，整条管道', en: 'One trajectory, the whole pipeline' },
};
