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
