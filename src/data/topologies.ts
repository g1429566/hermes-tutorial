// Chapter 24「多 Agent 协作设计题」数据源：五种多 agent 拓扑 + 场景题。
// 「Hermes 对应物」一栏对齐 AGENTS.md：§Delegation（delegate_task 的 leaf/orchestrator、
// batch tasks、max_concurrent_children）、§Kanban（dispatcher、failure_limit、board/tenant
// 隔离）、§Cron（context_from 链式作业）、§Curator（LLM review pass）。

export interface Topology {
  id: string;
  name: string;
  tagline: string;
  structure: string; // 结构描述
  dispatch: string; // 任务分发方式
  contextSharing: string; // 上下文共享策略
  faultIsolation: string; // 故障隔离
  useCases: string; // 适用场景
  hermes: string; // 在 Hermes 中的对应物
}

export interface TopologyScenario {
  id: string;
  title: string;
  description: string;
  recommended: string; // 推荐拓扑 id
  reasoning: string; // 推荐理由
}

export const TOPOLOGY_INTRO =
  '「我们要上多 agent」不是答案，拓扑才是。面试官想听你根据任务形状选结构：' +
  '任务能不能分解？质量门禁有多严？故障要不要隔离？下面五种模式覆盖了绝大多数设计题——' +
  '先逐一对比它们的结构、分发、上下文共享与故障隔离，再做底部的场景题。' +
  '每种模式都标注了它在 Hermes 里的真实对应物，回答时可以直接引用。';

export const TOPOLOGIES: Topology[] = [
  {
    id: 'manager',
    name: 'Manager 经理人',
    tagline: '一个 manager 拆任务、派 worker、收结果',
    structure:
      '中心辐射：一个 manager agent 持有全局目标，把任务拆解后分发给若干 worker，worker 完成后由 manager 汇总。worker 之间不通信。',
    dispatch: '中心式派发：manager 决定拆成什么、派给谁、什么时候收。worker 是被动的执行单元。',
    contextSharing:
      '最小共享：worker 只看到自己那份子任务和 manager 显式传入的 context；全局上下文只有 manager 有。',
    faultIsolation:
      'worker 级隔离：单个 worker 失败不拖垮其他 worker，manager 可以重派或降级；manager 本身是单点。',
    useCases: '可清晰分解的并行任务：多文件重构、并行调研、批量生成后汇总。',
    hermes:
      'delegate_task：默认 role="leaf" 的 worker 不能再委派；role="orchestrator" 保留 delegate_task 可再派工人（受 delegation.max_spawn_depth=2 限制）；batch tasks 数组并行，并发上限 delegation.max_concurrent_children（默认 3）。',
  },
  {
    id: 'handoff',
    name: 'Handoff 交接',
    tagline: '流水线接力，一棒的产出是下一棒的输入',
    structure:
      '链式：agent A 完成阶段一，把产出交给 agent B 做阶段二，依此类推。每个 agent 只关心自己的阶段。',
    dispatch: '按阶段接力：流程固定，每个节点完成后触发下一个节点。',
    contextSharing:
      '传递式共享：前一棒的产出（通常是摘要或产物路径）作为后一棒的输入，上游的完整上下文不向后传递。',
    faultIsolation:
      '节点级隔离：单点失败中断链条，需要检查点才能从断点续跑；错误会沿链条放大，前段质量决定后段上限。',
    useCases: '阶段明确的流水线：采集→清洗→分析→报告；大纲→初稿→审校→终稿。',
    hermes:
      'cron 的 context_from 字段：把 job A 的 last output 链进 job B 的 prompt，跨调度周期的持久化接力。',
  },
  {
    id: 'supervisor',
    name: 'Supervisor 监督者',
    tagline: '监督者不干活，只审查、打回、放行',
    structure:
      '双层：worker 产出结果，supervisor 按质量标准审查——不合格打回重做（带反馈），合格才放行。是审查-打回循环，不是一次通过。',
    dispatch: 'worker 自主执行 + supervisor 质检门禁；循环次数取决于质量而非预算。',
    contextSharing:
      '不对称共享：supervisor 看全程（任务 + 产出 + 历史反馈），worker 只看到任务和最近一次打回的理由。',
    faultIsolation:
      '质量向隔离：监督回路防止低质产出流出系统；代价是吞吐——打回循环本身需要上限，否则会空转。',
    useCases: '质量敏感任务：对外发布的内容、合规审查、代码 review 后才允许合并。',
    hermes:
      'kanban dispatcher 的 failure_limit：同一任务连续失败（默认 2 次）自动 block，防止打回循环空转；curator 的 LLM review pass 对技能做质量评审，pinned 技能豁免。',
  },
  {
    id: 'group',
    name: 'Group 群组',
    tagline: '对等 agent 共享黑板，自主认领协作',
    structure:
      '对等网络：多个角色平等的 agent 围绕一块共享状态（黑板/任务板）协作，没有中心协调者，靠协议和认领机制分工。',
    dispatch: '自认领：agent 从共享板上认领适合自己的任务，完成后再挂回板上。',
    contextSharing:
      '全共享：黑板对所有人可见，协作完全通过共享状态进行；需要命名空间或分区来防止互相踩踏。',
    faultIsolation:
      '弱隔离：共享状态是单点也是公地——需要硬边界（谁能看哪块板）加软分区（板内的租户隔离）。',
    useCases: '角色对等、分工难以预先规划的任务：多专家会诊、跨职能项目协作。',
    hermes:
      'kanban board 多 worker：board 是硬边界（HERMES_KANBAN_BOARD 钉在 worker 环境里，看不见其他 board），tenant 是板内软命名空间（workspace 路径 + memory key 隔离）。',
  },
  {
    id: 'swarm',
    name: 'Swarm 蜂群',
    tagline: '海量同质 worker 从队列抢任务',
    structure:
      '无中心队列：大量同质 worker 从一个任务队列抢占式取任务，做完一个拿下一个。worker 之间零通信、零共享。',
    dispatch: '队列抢占：原子 claim 防止重复领取；worker 挂掉后任务被回收重派。',
    contextSharing: '零共享：任务自带全部上下文，worker 之间不需要也不允许依赖彼此的状态。',
    faultIsolation:
      '最强隔离：单个 worker 崩溃只丢一个任务；关键在回收机制——stale claim 必须能被 reclaim，否则任务会漏。',
    useCases: '海量同质、互不依赖的任务：100 个仓库批量迁移、千张图片处理、大规模标注。',
    hermes:
      'kanban dispatcher（默认每 60s 一轮）：reclaim stale claims → promote ready tasks → 原子 claim → spawn assigned profiles；轻量场景用 delegate_task 的 batch tasks 并行代替。',
  },
];

export const TOPOLOGY_SCENARIOS: TopologyScenario[] = [
  {
    id: 'repo-migration',
    title: '场景一：100 个仓库批量迁移',
    description:
      '你要把公司 100 个仓库从旧 CI 迁移到新平台：每个仓库的操作相同（改配置、跑迁移脚本、验证、提 PR），仓库之间互不依赖，单个失败可以重试。你会选哪种拓扑？',
    recommended: 'swarm',
    reasoning:
      '海量同质 + 互不依赖 + 失败可重试，是 Swarm 的完美形状：任务进队列，worker 抢占式领取，原子 claim 防重复，挂掉的 claim 被 reclaim 重派。Hermes 里对应 kanban dispatcher 的回收-提升-认领循环；规模小一点也可以直接用 delegate_task 的 batch tasks（并发上限默认 3）。Manager 也能做，但中心派发在 100 个同质任务前是不必要的协调成本。',
  },
  {
    id: 'long-form-writing',
    title: '场景二：需要多轮审校的长文写作',
    description:
      '客户要一份对外发布的技术白皮书：质量不达标绝不能出门，通常要「写 → 审 → 打回重写」好几轮。流程本身（大纲、初稿、审校、终稿）是固定的。你会选哪种拓扑？',
    recommended: 'supervisor',
    reasoning:
      '质量门禁是核心约束，Supervisor 的审查-打回循环正好匹配：writer 产出、reviewer 按标准打回并附反馈，合格才放行。关键是给打回循环加上限——Hermes 的对应物是 kanban failure_limit（连续失败默认 2 次自动 block），防止监督循环空转。流程固定的部分（大纲→初稿→审校→终稿）也可以叠加 Handoff，用 cron 的 context_from 把上一棒的产出链进下一棒。',
  },
  {
    id: 'feature-dev',
    title: '场景三：一次复杂功能开发（查资料 + 写代码 + 跑测试）',
    description:
      '用户丢来一句话需求：「给我们的 CLI 加一个导出命令」。需要有人调研现有代码、有人写实现、有人跑测试修 bug，最后有人把结果整合成一次交付。你会选哪种拓扑？',
    recommended: 'manager',
    reasoning:
      '任务可分解但子任务性质不同、还需要最终整合，Manager 的中心辐射最合身：orchestrator 拆解并派发，leaf worker 各自执行（leaf 不能再用 delegate_task，边界天然清晰），orchestrator 汇总。Hermes 里就是 delegate_task 的 role="orchestrator" + role="leaf"，配合 max_spawn_depth=2 锁住委派树深度，max_concurrent_children 控制并行。子任务全部同形时才是 Swarm 的战场，这里不是。',
  },
];
