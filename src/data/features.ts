// Chapter 02「功能全景」数据源：七大能力矩阵 + 场景选择器。

import type { QuizItem } from '../lib/judge';

export interface Feature {
  id: string;
  name: string;
  desc: string;
  sourceRef: string; // 对应 hermes-agent 源码位置
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  featureIds: string[]; // 该场景主要调动的能力
  explanation: string;
}

export const FEATURES: Feature[] = [
  {
    id: 'tui',
    name: '完整 TUI',
    desc: '多行编辑、斜杠命令自动补全、历史、中断重定向、流式工具输出。',
    sourceRef: 'ui-tui/src/',
  },
  {
    id: 'gateway',
    name: '多平台网关',
    desc: 'Telegram / Discord / Slack / WhatsApp / Signal 等 20+ 平台，单一 gateway 进程。',
    sourceRef: 'gateway/platforms/',
  },
  {
    id: 'skills',
    name: '技能系统',
    desc: '自进化：从经验创建技能、在使用中改进；兼容 agentskills.io 开放标准。',
    sourceRef: 'skills/',
  },
  {
    id: 'cron',
    name: '定时自动化',
    desc: '内建 cron：自然语言描述定时任务，无人值守运行。',
    sourceRef: 'cron/',
  },
  {
    id: 'delegation',
    name: '委派与并行',
    desc: '派生隔离的子 agent；用 RPC 脚本压缩多步流水线。',
    sourceRef: 'run_agent.py',
  },
  {
    id: 'backends',
    name: '多终端后端',
    desc: 'local / Docker / SSH / Singularity / Modal / Daytona，后两者支持 serverless 休眠。',
    sourceRef: 'tools/environments/',
  },
  {
    id: 'models',
    name: '模型可切换',
    desc: 'Nous Portal、OpenRouter、OpenAI、自有 endpoint；`hermes model` 一键切换。',
    sourceRef: 'providers/',
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'understand-repo',
    title: '理解陌生仓库',
    description: '丢给 Hermes 一个没见过的代码库，让它讲清架构和关键路径。',
    featureIds: ['skills', 'delegation', 'models'],
    explanation:
      '读仓库主要靠文件工具与搜索（M1 第 07 章）；读到的架构结论会沉淀为技能（第 05/06 章），大型仓库可以委派子 agent 分头探索（第 09 章）。',
  },
  {
    id: 'modify-code',
    title: '直接修改代码',
    description: '让 Hermes 改 bug、写测试、跑构建，而不是只给建议。',
    featureIds: ['backends', 'tui', 'delegation'],
    explanation:
      '改代码在终端后端里执行（第 16 章）：本地、Docker 或 serverless；TUI 里可以实时看到工具输出并随时中断重定向（第 14 章）。',
  },
  {
    id: 'remote-control',
    title: '手机上遥控',
    description: '出门在外，通过 Telegram 让跑在云 VM 上的 Hermes 继续干活。',
    featureIds: ['gateway', 'backends', 'cron'],
    explanation:
      '网关把手机消息适配成统一会话（第 10/11 章），agent 实际在云端的 Docker / Modal 后端里执行（第 16 章）——设备不绑定你的笔记本。',
  },
  {
    id: 'scheduled',
    title: '定时自动巡检',
    description: '每天早上自动检查服务状态、汇总日志，异常时推送消息。',
    featureIds: ['cron', 'gateway', 'skills'],
    explanation:
      'cron 调度器按自然语言描述触发任务（第 12 章），结果经网关推送到你的聊天平台（第 10 章）；巡检流程可以固化为技能反复复用（第 05 章）。',
  },
];

export const FEATURES_QUIZ: QuizItem = {
  id: 'what-is-hermes-1',
  question: 'Hermes Agent 最核心的差异化能力是什么？',
  options: [
    { key: 'a', text: '它支持很多 LLM provider' },
    { key: 'b', text: '内置自进化学习循环：从经验创建并改进技能、跨会话记忆' },
    { key: 'c', text: '它有一个 TUI 界面' },
    { key: 'd', text: '它可以跑在 Docker 里' },
  ],
  correct: ['b'],
  explanation:
    'provider 多样、TUI、Docker 都是不错的特性，但核心差异化是「自进化学习循环」——技能自创建/自改进 + 跨会话记忆 + 用户建模。',
};
