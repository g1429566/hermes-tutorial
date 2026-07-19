# Hermes Agent 学习教程

一个围绕 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的**交互式学习教程网站**，本地部署、纯静态、无后端。

## 主线任务

把 Hermes 当作教学对象，让学习者：

1. **了解** Hermes 的各项功能；
2. **深入** Hermes 的工作原理；
3. 基于原理**自己设计新 agent、扩展 agent 功能**；
4. 达到 **AI agent 工程方向的面试要求**。

模块：M0 认识 Hermes → M1 深入原理 → M2 基于原理构建 → M3 面试冲刺。

## 本地部署

需要 Node.js ≥ 20。

### 1. 开发模式（热更新）

```bash
npm install
npm run dev
```

### 2. 生产预览

```bash
npm run build
npm run preview
```

### 3. Docker 一键部署

```bash
docker compose up --build
```

然后访问 http://localhost:8080 。

## 其他命令

| 命令             | 作用             |
| ---------------- | ---------------- |
| `npm test`       | 运行 Vitest 单测 |
| `npm run lint`   | ESLint 检查      |
| `npm run format` | Prettier 格式化  |
| `npm run check`  | Astro 类型检查   |

## 设计文档

- 设计 spec：`docs/superpowers/specs/2026-07-19-hermes-tutorial-website-design.md`
- 实现计划：`docs/superpowers/plans/`
