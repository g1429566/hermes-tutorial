// Chapter 03「安装与第一次对话」数据源：安装步骤、常用命令、检查清单。

import type { QuizItem } from '../lib/judge';

export interface InstallStep {
  id: string;
  title: string;
  command: string;
  note?: string;
}

export interface CliCommand {
  command: string;
  desc: string;
}

export const INSTALL_STEPS: InstallStep[] = [
  {
    id: 'install',
    title: '① Linux / macOS / WSL2 命令行安装',
    command: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
    note: '原生 Windows 选择官方桌面包或 PowerShell 安装器；Termux 使用专用 APT 指南，不套用下面的 shell 步骤。',
  },
  {
    id: 'reload-shell',
    title: '② 新开一个终端窗口',
    command: 'hermes --version',
    note: '按安装器提示完成后重开终端。此命令应能找到 Hermes 并显示版本；找不到时先检查安装与命令路径。',
  },
  {
    id: 'model',
    title: '③ 选择模型并完成认证',
    command: 'hermes model',
    note: '跟随向导选择可访问的 provider 与模型，完成该服务要求的认证。',
  },
  {
    id: 'doctor',
    title: '④ 检查运行环境',
    command: 'hermes doctor',
    note: '先处理本次文字对话需要的项目；无需先接通全部可选集成。',
  },
  {
    id: 'first-chat',
    title: '⑤ 启动并核对首轮对话',
    command: 'hermes',
    note: '先发送一个简短问题，再在 Hermes 输入 /help。文字回答成功不等于全部工具已经验证。',
  },
];

export const CLI_COMMANDS: CliCommand[] = [
  { command: 'hermes model', desc: '选择 LLM provider 与模型' },
  { command: 'hermes tools', desc: '配置启用的工具' },
  { command: 'hermes config set / get', desc: '设置 / 读取单个配置项' },
  { command: 'hermes gateway', desc: '启动消息网关（Telegram、Discord 等）' },
  { command: 'hermes setup', desc: '一次性完整配置向导' },
  { command: 'hermes doctor', desc: '诊断问题' },
];

export const INSTALL_CHECKLIST: { id: string; label: string }[] = [
  { id: 'curl-ready', label: '终端里 curl 可用' },
  { id: 'script-done', label: '安装脚本跑完且无报错' },
  { id: 'shell-reloaded', label: '已重新加载 shell 配置' },
  { id: 'doctor-ok', label: 'hermes doctor 诊断通过' },
  { id: 'model-picked', label: '已用 hermes model 选定模型' },
  { id: 'first-chat-done', label: '完成了第一次对话' },
];

export const INSTALL_QUIZ: QuizItem = {
  id: 'install-1',
  question: '下列哪个命令用于启动 Hermes 的交互式对话？',
  options: [
    { key: 'a', text: 'hermes setup' },
    { key: 'b', text: 'hermes' },
    { key: 'c', text: 'hermes doctor' },
    { key: 'd', text: 'hermes tools' },
  ],
  correct: ['b'],
  explanation:
    '直接运行 `hermes` 进入交互式 CLI。setup 是配置向导，doctor 是诊断工具，tools 用于配置启用的工具。',
};

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const INSTALL_STEPS_EN: InstallStep[] = [
  {
    id: 'install',
    title: '1. Install on Linux / macOS / WSL2',
    command: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
    note: 'Use the official Desktop package or PowerShell installer on native Windows; Termux has its own APT instructions.',
  },
  {
    id: 'reload-shell',
    title: '2. Reopen the terminal',
    command: 'hermes --version',
    note: 'Follow the installer instructions. A new terminal should find the command and show its version.',
  },
  {
    id: 'model',
    title: '3. Select a model and authenticate',
    command: 'hermes model',
    note: 'Choose an accessible provider and model, then complete its authentication flow.',
  },
  {
    id: 'doctor',
    title: '4. Check the environment',
    command: 'hermes doctor',
    note: 'Check required failures first; optional integrations need not all be configured.',
  },
  {
    id: 'first-chat',
    title: '5. Start a conversation',
    command: 'hermes',
    note: 'Ask a short question, then enter /help inside Hermes. A text reply does not verify every tool.',
  },
];

export const CLI_COMMANDS_EN: CliCommand[] = [
  { command: 'hermes model', desc: 'Choose LLM provider and model' },
  { command: 'hermes tools', desc: 'Configure enabled tools' },
  { command: 'hermes config set / get', desc: 'Set / read a single config value' },
  { command: 'hermes gateway', desc: 'Start the messaging gateway (Telegram, Discord, etc.)' },
  { command: 'hermes setup', desc: 'One-shot full setup wizard' },
  { command: 'hermes doctor', desc: 'Diagnose problems' },
];

export const INSTALL_CHECKLIST_EN: { id: string; label: string }[] = [
  { id: 'curl-ready', label: 'curl is available in your terminal' },
  { id: 'script-done', label: 'Install script finished without errors' },
  { id: 'shell-reloaded', label: 'Shell config reloaded' },
  { id: 'doctor-ok', label: 'hermes doctor diagnostics pass' },
  { id: 'model-picked', label: 'Model selected via hermes model' },
  { id: 'first-chat-done', label: 'First conversation completed' },
];

export const INSTALL_QUIZ_EN: QuizItem = {
  id: 'install-1',
  question: 'Which command starts an interactive Hermes conversation?',
  options: [
    { key: 'a', text: 'hermes setup' },
    { key: 'b', text: 'hermes' },
    { key: 'c', text: 'hermes doctor' },
    { key: 'd', text: 'hermes tools' },
  ],
  correct: ['b'],
  explanation:
    'Running `hermes` directly enters the interactive CLI. setup is the configuration wizard, doctor is the diagnostic tool, and tools configures which tools are enabled.',
};

// 本章实验室专属 UI 文案（组件里用 pick(lang, INSTALL_UI.xxx) 取值）。
export const INSTALL_UI = {
  intro: {
    zh: '按顺序完成五步。命令在系统终端执行；/help 等斜杠命令在 Hermes 会话中输入。此页面不会替你安装或运行命令。',
    en: 'Complete five steps in order. System commands run in your terminal; slash commands run in Hermes. This page does not install or execute them for you.',
  },
  copy: {
    zh: '复制',
    en: 'Copy',
  },
  tryIt: {
    zh: '我在终端跑过了',
    en: 'I ran this in my terminal',
  },
  commonCommands: {
    zh: '六个最常用命令',
    en: 'The six most-used commands',
  },
  checklist: {
    zh: '安装检查清单',
    en: 'Install checklist',
  },
};
