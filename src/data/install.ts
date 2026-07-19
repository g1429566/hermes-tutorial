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
