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
    title: '① 运行安装脚本（Linux / macOS / WSL2 / Termux）',
    command: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
    note: '安装器会自动处理 uv、Python 3.11、Node.js、ripgrep、ffmpeg 等依赖。',
  },
  {
    id: 'reload-shell',
    title: '② 重新加载 shell 配置',
    command: 'source ~/.bashrc   # 或 source ~/.zshrc',
  },
  {
    id: 'first-chat',
    title: '③ 启动第一次对话',
    command: 'hermes',
    note: '启动交互式 CLI，开始第一次对话。',
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
    title: '① Run the install script (Linux / macOS / WSL2 / Termux)',
    command: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
    note: 'The installer automatically handles uv, Python 3.11, Node.js, ripgrep, ffmpeg, and other dependencies.',
  },
  {
    id: 'reload-shell',
    title: '② Reload your shell config',
    command: 'source ~/.bashrc   # or source ~/.zshrc',
  },
  {
    id: 'first-chat',
    title: '③ Start your first conversation',
    command: 'hermes',
    note: 'Launches the interactive CLI and starts your first conversation.',
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
    zh: '三步跑通 Hermes。每张卡片里的命令都可以直接复制到终端；跑完一步就勾上「我在终端跑过了」，勾选状态会保存在本地进度里。',
    en: 'Get Hermes running in three steps. Every command card can be copied straight into your terminal; check "I ran this in my terminal" after each step — the state is saved in your local progress.',
  },
  copy: { zh: '复制', en: 'Copy' },
  tryIt: { zh: '我在终端跑过了', en: 'I ran this in my terminal' },
  commonCommands: { zh: '六个最常用命令', en: 'The six most-used commands' },
  checklist: { zh: '安装检查清单', en: 'Install checklist' },
};
