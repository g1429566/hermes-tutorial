// Chapter 23「Agent 循环设计题」与 Chapter 26「自我评估与面试清单」共用数据源。
// 所有模范思路以 hermes-agent 各区域 AGENTS.md 的真实设计为依据：
// agent/AGENTS.md §Agent loop / §Message-flow invariants、
// tools/AGENTS.md §Registry and discovery / §Toolsets / §Delegation、cron/AGENTS.md §Cron。

export interface LoopQuestion {
  id: string;
  question: string;
  hint: string; // 思考提示：翻转前的引导，不给答案
  answer: string; // 模范思路
  followUps: string[]; // 追问链（2–3 条）
  rubric: string[]; // 评分维度（3 条）
}

export interface SelfAssessmentTopic {
  id: string;
  topic: string;
  sourceRef: string; // 对应的 hermes-agent 源码路径或 AGENTS.md 章节
}

export const INTERVIEW_INTRO =
  '先给出机制与例子，再看参考思路。回答需要解释条件变化，不以背出内部字段为目标。';

export const LOOP_QUESTIONS: LoopQuestion[] = [
  {
    id: 'sync-while',
    question: '为什么顺序推进的主循环仍可处理流式和并行？',
    hint: '先区分阶段依赖、传输与工具执行。',
    answer:
      '读取决定计算，结果决定回答，所以阶段按依赖推进。agent/turn_api_call.py 仍可消费流式响应，agent/tool_executor.py 则可并行执行符合条件的工具批次。同步控制流不等于全系统没有并发。',
    followUps: ['举出独立读取与写后读取的不同安排。'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'append-only',
    question: '稳定的上下文前缀为什么有助于缓存？',
    hint: '说明匹配范围与重新建立缓存的条件。',
    answer:
      '支持前缀缓存的服务可以复用已有相同输入。改早期内容会影响从该处起的复用；并非任何变化都永久破坏整个缓存，也没有固定费用倍数。新会话读取新的记忆快照，避免为每次写入重建当前提示。',
    followUps: ['压缩为什么需要有意改变上下文？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'budget',
    question: '预算、迭代上限与空闲超时分别控制什么？',
    hint: '考虑持续活动但没有完成的循环。',
    answer:
      '预算和迭代上限限制消耗，空闲超时发现无进展的等待。子任务有自己的配置范围。某些路径给模型收尾机会，但收尾回答不能证明任务成功；明确报告已完成与未完成部分。',
    followUps: ['为什么一个持续输出的错误循环可能不触发空闲超时？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'interrupt',
    question: '用户中断后，如何保持工具与消息状态可解释？',
    hint: '区分停止信号、请求取消与工具收尾。',
    answer:
      '运行时接收中断并协调模型请求、工具执行与后续迭代。已发生的外部副作用不一定能撤销；需要整理每个调用的结果或中断状态，并保存可恢复信息。不能把它仅描述为下一轮 break。',
    followUps: ['消息已经发出但响应丢失，能直接重发吗？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'json-results',
    question: '工具为什么需要明确的结果边界？',
    hint: '区分 JSON 字符串与任意对象输出。',
    answer:
      'Hermes handler 约定返回 JSON 字符串，分发路径再关联调用并组织消息。结构化错误使模型能判断失败，但不保证自动恢复成功。大结果的截取或存储引用也要保留核验方式。',
    followUps: ['工具内部成功与用户目标成功有什么区别？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'register-vs-expose',
    question: '注册的工具为什么不一定对模型可见？',
    hint: '列出注册、工具组合、会话条件和必要依赖。',
    answer:
      '注册建立实现和定义的联系；toolset 与会话能力选择本次工具面；check_fn 检查可达性或配置前提。插件有自己的注册路径，不需要把个人工具硬塞进核心。已暴露工具仍有输入成本。',
    followUps: ['桌面能力应该按后端环境变量还是会话来源判断？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'compression-exception',
    question: '压缩怎样在窗口与信息保留之间取舍？',
    hint: '给出必须保留的目标、规则、已完成与待办。',
    answer:
      '缓存不扩大窗口；压缩用较短材料继续任务，有损失细节的风险，也会影响前缀复用。核对摘要能否支持下一步，而不是只看模型是否输出成功。必要时回查历史。',
    followUps: ['“已处理文件”为什么可能不是合格摘要？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'skill-injection',
    question: '读取技能与重建系统提示有何不同？',
    hint: '考虑尾部新材料与已有早期前缀。',
    answer:
      '显式技能调用可将内容作为当前请求材料加入，而不是修改已有系统提示。按需读取仍有 token 成本，也不代表所有已打开会话自动替换旧副本。保存、读取与执行效果需要分别验证。',
    followUps: ['技能已写入磁盘但仍待审批，这种说法哪里矛盾？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'parallel-tools',
    question: '同一批工具是否并行，由谁决定？',
    hint: '模型提出调用，运行时检查安全性和冲突。',
    answer:
      '模型一次可提出多个调用。批处理规划器按工具类型和路径冲突分为有序并行或串行段；执行结果保持调用关联和原收集顺序。并行不只存在于委派层。',
    followUps: ['读 A、读 B 与写 A、读 A 各怎样安排？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
  {
    id: 'after-loop',
    question: '一个回合结束后，哪些后台动作有不同触发时机？',
    hint: '先分清回合、会话、存储与空闲维护。',
    answer:
      '历史可在运行中持久化，外部 provider 按回合同步；后台复盘依据回合或工具迭代计数及开关；curator 检查空闲、间隔与托管条件。on_session_end 生命周期不同，不能把它们都写成退出时一起发生。',
    followUps: ['重启后恢复同一会话，是否等于新会话？'],
    rubric: ['说明对象与时机。', '走完例子，再改变一个条件。', '保留结论的适用边界。'],
  },
];

export const SELF_ASSESSMENT_TOPICS: SelfAssessmentTopic[] = [
  {
    id: 'loop',
    topic: 'Agent 主循环',
    sourceRef: 'run_agent.py + agent/conversation_loop.py · agent/AGENTS.md §Agent loop',
  },
  {
    id: 'caching',
    topic: 'Prompt caching 铁律',
    sourceRef: 'agent/AGENTS.md §Message-flow invariants',
  },
  {
    id: 'tools',
    topic: '工具注册与 toolsets',
    sourceRef: 'tools/registry.py + toolsets.py · §Registry and discovery / §Toolsets',
  },
  {
    id: 'skills',
    topic: '技能与策展器',
    sourceRef: 'skills/ + agent/curator.py · §Curator (skill lifecycle)',
  },
  {
    id: 'memory',
    topic: '记忆架构',
    sourceRef:
      'hermes_state.py + plugins/memory/ · agent/AGENTS.md §Memory, context engines, curator',
  },
  { id: 'delegation', topic: '委派系统', sourceRef: 'tools/delegate_tool.py · §Delegation' },
  { id: 'gateway', topic: '消息网关', sourceRef: 'gateway/run.py + gateway/platforms/' },
  { id: 'cron', topic: 'Cron 定时调度', sourceRef: 'cron/jobs.py + cron/scheduler.py · §Cron' },
  {
    id: 'tui',
    topic: 'TUI 架构',
    sourceRef: 'ui-tui/ + tui_gateway/ · §Process model / §Key surfaces',
  },
  {
    id: 'cli',
    topic: 'CLI 架构',
    sourceRef: 'cli.py + hermes_cli/commands.py · §CLI architecture',
  },
  {
    id: 'profiles',
    topic: 'Profiles 多实例',
    sourceRef: 'hermes_constants.py · §Profiles (multi-instance)',
  },
  {
    id: 'plugins',
    topic: '插件系统',
    sourceRef: 'plugins/ + hermes_cli/plugins.py · §Plugin kinds and their discovery systems',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const INTERVIEW_INTRO_EN =
  'Explain a mechanism and an example before revealing the reference. Focus on changed conditions, not memorized fields.';

export const LOOP_QUESTIONS_EN: LoopQuestion[] = [
  {
    id: 'sync-while',
    question: 'Why can an ordered loop still use streaming and concurrency?',
    hint: 'Separate phase dependencies, transport, and tool execution.',
    answer:
      'Reads inform calculation and results inform the answer, so phases follow dependencies. turn_api_call handles streaming; tool_executor can run eligible calls concurrently. Ordered control flow is not a claim that the whole system is serial.',
    followUps: ['Compare independent reads with a read that depends on a write.'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'append-only',
    question: 'Why preserve established context prefixes?',
    hint: 'Explain matching ranges and later reuse.',
    answer:
      'Supporting services can reuse identical earlier input. An edit affects reuse from its divergence point, not necessarily all future requests forever. Costs have no fixed multiplier. New sessions read updated memory without rebuilding the active prompt after each write.',
    followUps: ['Why deliberately reshape context during compression?'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'budget',
    question: 'What do budgets, iteration limits, and inactivity timeouts control?',
    hint: 'Consider a loop that stays active without completing.',
    answer:
      'Budgets and iteration caps bound consumption; inactivity timeouts detect lack of progress. Child tasks have their own configuration. A closeout opportunity does not establish success; distinguish completed and pending work.',
    followUps: ['Why might an active erroneous loop avoid an inactivity timeout?'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'interrupt',
    question: 'How should interruption preserve understandable tool and message state?',
    hint: 'Separate stop signals, request cancellation, and cleanup.',
    answer:
      'The runtime coordinates requests, tools, and later iterations after interruption. External effects may already exist. Record outcomes or interrupted status for calls and retain recovery information; it is more than a break at the next loop boundary.',
    followUps: ['Can you resend immediately if delivery may have succeeded?'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'json-results',
    question: 'Why give tools a defined result boundary?',
    hint: 'Distinguish a JSON result from an arbitrary object.',
    answer:
      'Hermes handlers conventionally return JSON strings, which dispatch associates with calls. Structured errors enable diagnosis but do not guarantee successful recovery. Bounded output or overflow references must retain a way to verify evidence.',
    followUps: ['How does tool success differ from task success?'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'register-vs-expose',
    question: 'Why can a registered tool remain invisible?',
    hint: 'Trace registration, toolsets, session conditions, and prerequisites.',
    answer:
      'Registration connects definitions to implementations. Toolsets and session capabilities select exposure; check_fn checks reachability or prerequisites. Plugins use their supported registration path. Exposed tools still consume input.',
    followUps: [
      'Should desktop capabilities depend on a backend environment flag or session source?',
    ],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'compression-exception',
    question: 'How does compression trade capacity for retained information?',
    hint: 'Name goals, rules, completed scope, and pending work.',
    answer:
      'Caching does not enlarge the window. Compression creates shorter continuation material, may lose detail, and changes prefix reuse. Verify the ability to continue and consult history when needed.',
    followUps: ['Why can “processed files” be an inadequate summary?'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'skill-injection',
    question: 'How does reading a skill differ from rebuilding the system prompt?',
    hint: 'Compare new task material with an established earlier prefix.',
    answer:
      'An explicit skill invocation adds relevant task material without rewriting the established system prompt. Reading still costs tokens and does not replace every earlier copy in open sessions. Verify saving, reading, and effect separately.',
    followUps: ['Why is “already applied to disk, still staged” a contradiction?'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'parallel-tools',
    question: 'Who determines whether a tool batch executes concurrently?',
    hint: 'The model proposes calls; runtime checks eligibility and conflicts.',
    answer:
      'A model may propose several calls. The runtime planner creates ordered parallel or sequential segments based on tool type and path conflicts, preserving result association and collection order. Delegation is not the only concurrency mechanism.',
    followUps: ['Compare reading A and B with writing then reading A.'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
  {
    id: 'after-loop',
    question: 'Which post-turn activities have different triggers?',
    hint: 'Distinguish a turn, session, persistence, and idle maintenance.',
    answer:
      'History can persist during execution; providers synchronize turns. Review uses counters and gates, while curator maintenance checks idleness, interval, and management eligibility. Session-end hooks are another lifecycle boundary.',
    followUps: ['Is resuming after restart equivalent to a new session?'],
    rubric: [
      'Explain objects and timing.',
      'Trace one example and a changed condition.',
      'State the applicable boundary.',
    ],
  },
];

export const SELF_ASSESSMENT_TOPICS_EN: SelfAssessmentTopic[] = [
  {
    id: 'loop',
    topic: 'Agent main loop',
    sourceRef: 'run_agent.py + agent/conversation_loop.py · agent/AGENTS.md §Agent loop',
  },
  {
    id: 'caching',
    topic: 'Prompt-caching iron rule',
    sourceRef: 'agent/AGENTS.md §Message-flow invariants',
  },
  {
    id: 'tools',
    topic: 'Tool registration & toolsets',
    sourceRef: 'tools/registry.py + toolsets.py · §Registry and discovery / §Toolsets',
  },
  {
    id: 'skills',
    topic: 'Skills & curator',
    sourceRef: 'skills/ + agent/curator.py · §Curator (skill lifecycle)',
  },
  {
    id: 'memory',
    topic: 'Memory architecture',
    sourceRef:
      'hermes_state.py + plugins/memory/ · agent/AGENTS.md §Memory, context engines, curator',
  },
  {
    id: 'delegation',
    topic: 'Delegation system',
    sourceRef: 'tools/delegate_tool.py · §Delegation',
  },
  { id: 'gateway', topic: 'Message gateway', sourceRef: 'gateway/run.py + gateway/platforms/' },
  { id: 'cron', topic: 'Cron scheduling', sourceRef: 'cron/jobs.py + cron/scheduler.py · §Cron' },
  {
    id: 'tui',
    topic: 'TUI architecture',
    sourceRef: 'ui-tui/ + tui_gateway/ · §Process model / §Key surfaces',
  },
  {
    id: 'cli',
    topic: 'CLI architecture',
    sourceRef: 'cli.py + hermes_cli/commands.py · §CLI architecture',
  },
  {
    id: 'profiles',
    topic: 'Profiles (multi-instance)',
    sourceRef: 'hermes_constants.py · §Profiles (multi-instance)',
  },
  {
    id: 'plugins',
    topic: 'Plugin system',
    sourceRef: 'plugins/ + hermes_cli/plugins.py · §Plugin kinds and their discovery systems',
  },
];

// ── 实验室专属 UI 文案（InterviewLab / SelfAssessmentLab） ──────────

export const INTERVIEW_UI = {
  progressLabel: { zh: '攻克进度', en: 'Mastery progress' },
  masteredSuffix: { zh: '题已攻克', en: 'mastered' },
  allMastered: {
    zh: '全部攻克——别忘了把追问链也过一遍，面试官真正拉开差距的地方在那里。',
    en: "All mastered — don't forget to walk the follow-up chains too; that is where interviewers really separate candidates.",
  },
  isMastered: { zh: '✓ 能答上来了', en: '✓ I can answer this' },
  markMastered: { zh: '标记：能答上来了', en: 'Mark: I can answer this' },
  hintLabel: { zh: '思考提示', en: 'HINT' },
  thinkFirst: { zh: '我先想想', en: 'Think first' },
  thinkFirstBody: {
    zh: '别急着翻。用 60 秒在脑子里组织一遍：先给结论，再给机制，最后给一个 Hermes 里的真实例子。',
    en: "Don't flip yet. Take 60 seconds to organize your answer: conclusion first, then the mechanism, then a real Hermes example.",
  },
  modelAnswer: { zh: '模范思路', en: 'MODEL ANSWER' },
  followUps: { zh: '追问链', en: 'FOLLOW-UPS' },
  rubric: { zh: '评分维度', en: 'RUBRIC' },
};

// 自评档位定义：label/desc 按语言取值，level 数值与 AssessmentLevel 对齐。
export const SELF_ASSESSMENT_LEVELS: {
  level: 1 | 2 | 3;
  label: { zh: string; en: string };
  desc: { zh: string; en: string };
}[] = [
  {
    level: 1,
    label: { zh: '能讲清', en: 'Can explain' },
    desc: {
      zh: '能向外行讲明白它是什么、为什么存在',
      en: 'Can explain to a layperson what it is and why it exists',
    },
  },
  {
    level: 2,
    label: { zh: '能设计', en: 'Can design' },
    desc: {
      zh: '能复刻它的设计，并讲清关键取舍',
      en: 'Can reproduce its design and explain the key trade-offs',
    },
  },
  {
    level: 3,
    label: { zh: '能答追问', en: 'Survives follow-ups' },
    desc: {
      zh: '经得住追问链：边界、故障、替代方案',
      en: 'Withstands the follow-up chain: boundaries, failures, alternatives',
    },
  },
];

export const SELF_ASSESSMENT_UI = {
  introLead: {
    zh: '面试前最后一道手续是诚实的自评。对着下面 12 个主题逐一点选你达到的最高档位：',
    en: 'The last step before the interview is an honest self-assessment. For each of the 12 topics below, pick the highest level you have reached:',
  },
  introHint1: { zh: '（可以说给外行听）', en: '(can explain it to a layperson)' },
  introHint2: {
    zh: '（能复刻设计并讲清取舍）',
    en: '(can reproduce the design and explain the trade-offs)',
  },
  introHint3: {
    zh: '（经得住边界、故障与替代方案的连环问）',
    en: '(withstands a chain of boundary, failure, and alternative questions)',
  },
  introTail: {
    zh: '再点一次当前档位可以撤回。底部会汇总出你的薄弱项——每一条都附了回链， 面试前把档位 <2 的主题补齐。',
    en: 'Click the current level again to undo. Your weak topics are summarized at the bottom — each with a link back to the source. Before the interview, bring every topic below level 2 up to par.',
  },
  topicHeader: { zh: '主题', en: 'Topic' },
  overallProgress: { zh: '总进度', en: 'Overall progress' },
  evaluated: { zh: '已评估', en: 'Evaluated' },
  distByLevel: { zh: '按档位分布', en: 'Distribution by level' },
  level0Name: { zh: '0 · 未评估 / 讲不清', en: "0 · Not assessed / can't explain" },
  weakTitlePrefix: { zh: '薄弱项（档位 <2，', en: 'Weak topics (level <2, ' },
  weakTitleSuffix: { zh: ' 个）', en: ')' },
  noWeak: {
    zh: '没有薄弱项——12 个主题全部达到「能设计」以上。去把第 30 章的追问链再过一遍， 然后放平心态去面试。',
    en: 'No weak topics — all 12 are at "Can design" or above. Walk the follow-up chains in Chapter 30 once more, then go into the interview relaxed.',
  },
  currentLevel: { zh: '当前档位', en: 'Current level' },
  reviewLink: { zh: '回炉 → ', en: 'Review → ' },
};
