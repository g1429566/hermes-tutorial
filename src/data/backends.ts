// Chapter 16「终端后端」数据源：6 种执行环境对比 + serverless 休眠/唤醒时序。
// 内容对齐 hermes-agent/tools/environments/ 各后端源码的 docstring 与真实机制
// （对应 AGENTS.md 项目结构中的 environments/ 一行）。

export interface Backend {
  id: string;
  name: string;
  tagline: string;
  isolation: string;
  scenarios: string[];
  source: string;
  features: string[];
  serverless: boolean;
}

export interface ServerlessStep {
  id: string;
  label: string;
  title: string;
  body: string;
}

export interface CompareRow {
  id: string; // 对应 Backend.id
  isolation: string;
  cost: string;
  startup: string;
  platform: string;
}

export const BACKENDS_INTRO =
  'Hermes 的终端工具不只有一种「跑法」：同一条命令可以跑在本机进程、Docker 容器、' +
  '远程 SSH 主机、HPC 集群的 Singularity 容器，或 Modal / Daytona 的云沙箱里。' +
  '它们都实现 tools/environments/ 下的同一套 BaseEnvironment 接口，区别在隔离级别、' +
  '成本模型与启动速度。选中下面每张卡，看各后端的真实机制。';

/* ── ① 六种后端 ─────────────────────────────────────────────────── */
export const BACKENDS: Backend[] = [
  {
    id: 'local',
    name: 'local',
    tagline: '本机进程，零隔离零依赖',
    isolation: '无隔离——命令以 agent 进程的用户权限直接跑在本机',
    scenarios: ['个人开发机、完全信任的环境', '调试 Hermes 自身', '不想装任何额外依赖'],
    source: 'tools/environments/local.py',
    features: [
      'spawn-per-call：每次调用起一个新进程，并带会话快照',
      '工作目录 = 进程当前目录（os.getcwd()，CLI 模式）',
      '内置 Windows 路径翻译（Git Bash / MSYS 风格路径 → 原生路径）',
    ],
    serverless: false,
  },
  {
    id: 'docker',
    name: 'Docker',
    tagline: '本机容器，安全加固的隔离',
    isolation: '容器级隔离：cap-drop ALL、no-new-privileges、PID limits',
    scenarios: ['执行不可信代码', '需要干净、可控的依赖环境', '限制资源用量（CPU / 内存 / 磁盘）'],
    source: 'tools/environments/docker.py',
    features: [
      '安全加固：cap-drop ALL、no-new-privileges、PID limits',
      'CPU / 内存 / 磁盘资源限制可配置',
      '可选文件系统持久化（bind mounts）',
    ],
    serverless: false,
  },
  {
    id: 'ssh',
    name: 'SSH',
    tagline: '远程主机，连接复用',
    isolation: '取决于远端机器——命令全部在远程主机上执行',
    scenarios: ['利用远程算力或专用环境', '代码与数据在另一台机器上', '跨机器工作流'],
    source: 'tools/environments/ssh.py',
    features: [
      'ControlMaster 连接持久化：多条命令复用同一条 SSH 连接',
      '免去每次执行的重复握手开销',
      '本地 agent + 远程执行的混合形态',
    ],
    serverless: false,
  },
  {
    id: 'singularity',
    name: 'Singularity',
    tagline: 'HPC 集群的持久容器',
    isolation: '容器级隔离：--containall、--no-home、capability dropping',
    scenarios: ['HPC / 超算集群（无 root、无 Docker 守护进程）', '需要跨会话保留环境的批处理'],
    source: 'tools/environments/singularity.py',
    features: [
      '优先找 apptainer，其次 singularity CLI',
      '安全加固：--containall、--no-home、capability dropping',
      'writable overlay 目录跨会话持久，资源限制可配置',
    ],
    serverless: false,
  },
  {
    id: 'modal',
    name: 'Modal',
    tagline: 'serverless 云沙箱',
    isolation: '云沙箱隔离——每个任务跑在 Modal 云端 Sandbox 里',
    scenarios: ['弹性云端算力，按需付费', '本机资源不够或不想占用本机'],
    source: 'tools/environments/modal.py',
    features: [
      '原生 Modal SDK：Sandbox.create() + Sandbox.exec()',
      'snapshot_filesystem() 拍文件系统快照，跨会话持久',
      '快照 id 记录在 modal_snapshots.json，下次从快照恢复',
    ],
    serverless: true,
  },
  {
    id: 'daytona',
    name: 'Daytona',
    tagline: 'serverless 云沙箱',
    isolation: '云沙箱隔离——每个任务跑在 Daytona 云端沙箱里',
    scenarios: ['云端开发环境', '长时间运行的任务', '按需付费的弹性执行'],
    source: 'tools/environments/daytona.py',
    features: [
      'Daytona Python SDK 创建与管理云沙箱',
      '持久沙箱：cleanup 时 stop()，下次创建时 start() 恢复',
      '文件系统跨会话保留（持久化开启时）',
    ],
    serverless: true,
  },
];

/* ── ② serverless 休眠/唤醒时序（Modal / Daytona 共用模型） ────────── */
export const SERVERLESS_STEPS: ServerlessStep[] = [
  {
    id: 'idle',
    label: '空闲',
    title: '沙箱空闲',
    body: '云端沙箱没有任务在跑。计算资源空转就是白花钱——serverless 后端的核心动机就是把这段时间的成本降到接近零。',
  },
  {
    id: 'sleep',
    label: '休眠',
    title: '休眠省成本，文件系统保留',
    body: 'Daytona 在 cleanup 时 stop() 沙箱；Modal 用 snapshot_filesystem() 拍下文件系统快照后 terminate()。计算资源释放，但文件系统被完整保留——这是「休眠」而不是「销毁」。',
  },
  {
    id: 'arrive',
    label: '新任务',
    title: '新任务到达',
    body: 'agent 又需要执行一条终端命令。对上层来说这只是普通的一次调用，感知不到下面的唤醒过程。',
  },
  {
    id: 'wake',
    label: '冷启动',
    title: '冷启动唤醒',
    body: 'Daytona 对同一个沙箱调 start() 恢复；Modal 按 modal_snapshots.json 里记录的快照 id 从快照重建。这一步比本地执行慢——serverless 的成本优势就是用冷启动延迟换来的。',
  },
  {
    id: 'resume',
    label: '恢复执行',
    title: '环境一致，继续执行',
    body: '文件系统与休眠前完全一致：之前装的依赖、写的文件都还在。命令继续跑，会话无缝衔接。',
  },
];

/* ── ③ 对比表（定性，依据各后端源码 docstring 与配置项） ──────────── */
export const COMPARE_ROWS: CompareRow[] = [
  {
    id: 'local',
    isolation: '无（同机同权限）',
    cost: '零额外成本',
    startup: '即时（spawn-per-call）',
    platform: '本机（macOS / Linux / Windows）',
  },
  {
    id: 'docker',
    isolation: '容器级（cap-drop ALL 加固）',
    cost: '本机资源',
    startup: '秒级',
    platform: '装有 Docker 的机器',
  },
  {
    id: 'ssh',
    isolation: '取决于远端机器',
    cost: '远端机器成本',
    startup: '首次连接后复用（ControlMaster）',
    platform: '任何可 SSH 的远程主机',
  },
  {
    id: 'singularity',
    isolation: '容器级（--containall）',
    cost: '集群资源',
    startup: '秒级（持久容器）',
    platform: 'HPC 集群（Apptainer / Singularity）',
  },
  {
    id: 'modal',
    isolation: '云沙箱',
    cost: '按用量计费',
    startup: '冷启动较慢（快照恢复）',
    platform: 'Modal 云',
  },
  {
    id: 'daytona',
    isolation: '云沙箱',
    cost: '按用量计费',
    startup: '冷启动（可恢复同一沙箱）',
    platform: 'Daytona 云',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const BACKENDS_INTRO_EN =
  "Hermes's terminal tool has more than one way to run: the same command can execute in a " +
  'local process, a Docker container, a remote SSH host, a Singularity container on an HPC ' +
  'cluster, or a Modal / Daytona cloud sandbox. They all implement the same BaseEnvironment ' +
  'interface under tools/environments/; what differs is isolation level, cost model, and ' +
  'startup speed. Select each card below to see how each backend really works.';

export const BACKENDS_EN: Backend[] = [
  {
    id: 'local',
    name: 'local',
    tagline: 'Local process, zero isolation, zero dependencies',
    isolation:
      "No isolation — commands run directly on the local machine with the agent process's user permissions",
    scenarios: [
      'Personal dev machines, fully trusted environments',
      'Debugging Hermes itself',
      "Don't want to install any extra dependencies",
    ],
    source: 'tools/environments/local.py',
    features: [
      'spawn-per-call: every call starts a fresh process, carrying a session snapshot',
      'Working directory = current directory of the process (os.getcwd(), CLI mode)',
      'Built-in Windows path translation (Git Bash / MSYS style paths → native paths)',
    ],
    serverless: false,
  },
  {
    id: 'docker',
    name: 'Docker',
    tagline: 'Local container, hardened isolation',
    isolation: 'Container-level isolation: cap-drop ALL, no-new-privileges, PID limits',
    scenarios: [
      'Running untrusted code',
      'Need a clean, controlled dependency environment',
      'Limiting resource usage (CPU / memory / disk)',
    ],
    source: 'tools/environments/docker.py',
    features: [
      'Hardened: cap-drop ALL, no-new-privileges, PID limits',
      'Configurable CPU / memory / disk resource limits',
      'Optional filesystem persistence (bind mounts)',
    ],
    serverless: false,
  },
  {
    id: 'ssh',
    name: 'SSH',
    tagline: 'Remote host, connection reuse',
    isolation: 'Depends on the remote machine — all commands execute on the remote host',
    scenarios: [
      'Leveraging remote compute or specialized environments',
      'Code and data live on another machine',
      'Cross-machine workflows',
    ],
    source: 'tools/environments/ssh.py',
    features: [
      'ControlMaster connection persistence: many commands reuse one SSH connection',
      'Avoids repeated handshake overhead on every execution',
      'Hybrid shape: local agent + remote execution',
    ],
    serverless: false,
  },
  {
    id: 'singularity',
    name: 'Singularity',
    tagline: 'Persistent containers for HPC clusters',
    isolation: 'Container-level isolation: --containall, --no-home, capability dropping',
    scenarios: [
      'HPC / supercomputing clusters (no root, no Docker daemon)',
      'Batch jobs that need the environment kept across sessions',
    ],
    source: 'tools/environments/singularity.py',
    features: [
      'Prefers apptainer, falls back to the singularity CLI',
      'Hardened: --containall, --no-home, capability dropping',
      'Writable overlay directory persists across sessions; resource limits configurable',
    ],
    serverless: false,
  },
  {
    id: 'modal',
    name: 'Modal',
    tagline: 'Serverless cloud sandbox',
    isolation: 'Cloud sandbox isolation — each task runs in a Modal cloud Sandbox',
    scenarios: [
      'Elastic cloud compute, pay per use',
      "Local resources aren't enough, or you'd rather not occupy your machine",
    ],
    source: 'tools/environments/modal.py',
    features: [
      'Native Modal SDK: Sandbox.create() + Sandbox.exec()',
      'snapshot_filesystem() takes a filesystem snapshot, persisted across sessions',
      'Snapshot id recorded in modal_snapshots.json; restored from the snapshot next time',
    ],
    serverless: true,
  },
  {
    id: 'daytona',
    name: 'Daytona',
    tagline: 'Serverless cloud sandbox',
    isolation: 'Cloud sandbox isolation — each task runs in a Daytona cloud sandbox',
    scenarios: [
      'Cloud development environments',
      'Long-running tasks',
      'Elastic pay-per-use execution',
    ],
    source: 'tools/environments/daytona.py',
    features: [
      'Daytona Python SDK creates and manages cloud sandboxes',
      'Persistent sandbox: stop() on cleanup, start() to resume on next creation',
      'Filesystem retained across sessions (when persistence is enabled)',
    ],
    serverless: true,
  },
];

export const SERVERLESS_STEPS_EN: ServerlessStep[] = [
  {
    id: 'idle',
    label: 'Idle',
    title: 'Sandbox idle',
    body: 'The cloud sandbox has no task running. Idle compute is money burned — the core motivation of serverless backends is driving the cost of this period to near zero.',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    title: 'Sleep to save cost, filesystem kept',
    body: 'Daytona stop()s the sandbox on cleanup; Modal takes a filesystem snapshot with snapshot_filesystem() and then terminate()s. Compute is released, but the filesystem is fully preserved — this is "sleep", not "destroy".',
  },
  {
    id: 'arrive',
    label: 'New task',
    title: 'A new task arrives',
    body: 'The agent needs to run another terminal command. To the upper layers this is just an ordinary call — the wake-up underneath is invisible.',
  },
  {
    id: 'wake',
    label: 'Cold start',
    title: 'Cold-start wake-up',
    body: 'Daytona calls start() on the same sandbox to resume it; Modal rebuilds from the snapshot id recorded in modal_snapshots.json. This step is slower than local execution — the cost advantage of serverless is bought with cold-start latency.',
  },
  {
    id: 'resume',
    label: 'Resume',
    title: 'Same environment, keep executing',
    body: 'The filesystem is exactly as it was before sleep: previously installed dependencies and written files are all still there. The command runs on, and the session continues seamlessly.',
  },
];

export const COMPARE_ROWS_EN: CompareRow[] = [
  {
    id: 'local',
    isolation: 'None (same machine, same permissions)',
    cost: 'Zero extra cost',
    startup: 'Instant (spawn-per-call)',
    platform: 'Local machine (macOS / Linux / Windows)',
  },
  {
    id: 'docker',
    isolation: 'Container-level (hardened with cap-drop ALL)',
    cost: 'Local resources',
    startup: 'Seconds',
    platform: 'Any machine with Docker',
  },
  {
    id: 'ssh',
    isolation: 'Depends on the remote machine',
    cost: 'Remote machine cost',
    startup: 'Reused after first connect (ControlMaster)',
    platform: 'Any SSH-reachable remote host',
  },
  {
    id: 'singularity',
    isolation: 'Container-level (--containall)',
    cost: 'Cluster resources',
    startup: 'Seconds (persistent container)',
    platform: 'HPC clusters (Apptainer / Singularity)',
  },
  {
    id: 'modal',
    isolation: 'Cloud sandbox',
    cost: 'Pay per usage',
    startup: 'Slow cold start (snapshot restore)',
    platform: 'Modal cloud',
  },
  {
    id: 'daytona',
    isolation: 'Cloud sandbox',
    cost: 'Pay per usage',
    startup: 'Cold start (can resume the same sandbox)',
    platform: 'Daytona cloud',
  },
];

/* ── 组件专属 UI 文案 ─────────────────────────────────────────── */
export const BACKENDS_UI = {
  backendsKicker: { zh: '执行环境', en: 'Execution environments' },
  backendsTitle: {
    zh: '六种后端，同一套接口',
    en: 'Six backends, one interface',
  },
  isolationLabel: { zh: '隔离级别', en: 'Isolation level' },
  scenariosLabel: { zh: '适用场景', en: 'Best for' },
  featuresLabel: { zh: '特点（源自源码）', en: 'Features (from the source)' },
  serverlessKicker: { zh: 'serverless 时序', en: 'Serverless timeline' },
  serverlessTitle: {
    zh: '休眠 / 唤醒的五个阶段',
    en: 'The five phases of sleep / wake',
  },
  serverlessDesc: {
    zh: (name: string) =>
      `${name} 是 serverless 后端：不用时休眠省成本，用时冷启动恢复。点击每个阶段看细节。`,
    en: (name: string) =>
      `${name} is a serverless backend: it sleeps to save cost when idle and cold-starts back when needed. Click each phase for details.`,
  },
  compareKicker: { zh: '横向对比', en: 'Side by side' },
  compareTitle: {
    zh: '一张表看懂六种后端',
    en: 'Six backends in one table',
  },
  thBackend: { zh: '后端', en: 'Backend' },
  thIsolation: { zh: '隔离性', en: 'Isolation' },
  thCost: { zh: '成本', en: 'Cost' },
  thStartup: { zh: '启动速度', en: 'Startup' },
  thPlatform: { zh: '适用平台', en: 'Platform' },
  compareNote: {
    zh: '定性对比，依据各后端源码 docstring 与配置项；当前选中的后端以绿色高亮。',
    en: "Qualitative comparison based on each backend's source docstrings and config options; the selected backend is highlighted in green.",
  },
  takeaway: {
    zh: '一句话记住终端后端：同一套 BaseEnvironment 接口，六种「跑法」—— 本机求快、 容器求隔离、SSH 借算力、serverless 用冷启动换成本。',
    en: 'Terminal backends in one sentence: one BaseEnvironment interface, six ways to run — local for speed, containers for isolation, SSH for borrowed compute, serverless trading cold starts for cost.',
  },
};
