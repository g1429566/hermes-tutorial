# Hermes Agent 学习教程

[![CI](https://github.com/g1429566/hermes-tutorial/actions/workflows/ci.yml/badge.svg)](https://github.com/g1429566/hermes-tutorial/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6)
![Node](https://img.shields.io/badge/Node-%E2%89%A520.9-3c873a)
![License](https://img.shields.io/badge/License-MIT-yellow)

围绕 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的**交互式学习教程网站**：单页沉浸式应用，纯静态导出、无后端、可完全离线运行。

## 简介

本教程把 Hermes 当作教学对象，通过 33 章循序渐进的课程，让学习者：

1. **了解** Hermes 的各项功能（M0 认识 Hermes）；
2. **深入** Hermes 的工作原理（M1 深入原理，14 章对照真实源码）；
3. 基于原理**自己设计新 agent、扩展 agent 功能**（M2 基于原理构建）；
4. 达到 **AI agent 工程方向的面试要求**（M3 面试冲刺 + M4 扩展与前沿）。

每章 = kicker + 讲解 + 交互实验室 + 要点 + 完成按钮。第 19 章内嵌 Pyodide（CPython WebAssembly）沙箱，可在浏览器中直接运行 Python 代码。

## 课程结构

| 模块 | 主题 | 章数 |
| ---- | ---------------- | ---- |
| M0 | 认识 Hermes | 4 |
| M1 | 深入原理 | 14 |
| M2 | 基于原理构建 | 5 |
| M3 | 面试冲刺 | 4 |
| M4 | 扩展与前沿 | 2 |
| M5 | Agent 核心补全 | 4 |

M5 覆盖上下文压缩与 checkpoint、模型路由与凭据池、多模态工具、批处理与评测。

## 特性

- 33 个交互实验室（lab），每章一个可动手操作的组件
- 学习进度存 `localStorage`：版本化 key，支持导出 / 导入 / v1 迁移 / 重置
- Hash 路由，纯静态部署到任意静态服务器即可使用
- Pyodide 运行时由 `postinstall` 从 npm 包 vendor 到 `public/pyodide/`，全程离线
- Vitest 单元测试 + ESLint + Prettier + GitHub Actions CI

## 快速开始

需要 Node.js ≥ 20.9。

### 开发模式（热更新）

```bash
npm install
npm run dev
```

### 生产模式（静态导出 + 本地静态服务器）

```bash
npm run build   # 产出 out/
npm run start   # http://localhost:3000
```

### Docker 一键部署（nginx）

```bash
docker compose up --build
```

然后访问 http://localhost:8080 。

## 技术栈

Next.js 16（静态导出）+ React 19 + Tailwind CSS 4 + TypeScript 6。内容以 TypeScript 类型化数据结构嵌入（`src/data/`），非 MDX。

## 项目结构

```
app/               # Next.js App Router 入口（layout / page / globals.css）
src/
  components/      # CourseNav / ChapterRenderer / Quiz / labs/ 各章交互实验室
  data/            # 33 章元数据 + 各章内容数据（类型化 TS）
  hooks/           # useChapter（hash 路由）/ useProgress（进度订阅）
  lib/             # progress v1/v2、assessment、cron-explain、judge、skill-validate
scripts/           # serve.mjs（静态服务器）/ setup-pyodide.mjs（vendor Pyodide）
tests/             # Vitest 单元测试
```

## 常用命令

| 命令                 | 作用             |
| -------------------- | ---------------- |
| `npm test`           | 运行 Vitest 单测 |
| `npm run test:watch` | Vitest 监听模式  |
| `npm run lint`       | ESLint 检查      |
| `npm run format`     | Prettier 格式化  |

## License

[MIT](LICENSE)
