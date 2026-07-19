# Hermes Agent 学习教程

一个围绕 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的**交互式学习教程网站**：单页沉浸式应用，本地部署、纯静态、无后端。

## 主线任务

把 Hermes 当作教学对象，让学习者：

1. **了解** Hermes 的各项功能（M0 认识 Hermes）；
2. **深入** Hermes 的工作原理（M1 深入原理，14 章对照真实源码）；
3. 基于原理**自己设计新 agent、扩展 agent 功能**（M2 基于原理构建）；
4. 达到 **AI agent 工程方向的面试要求**（M3 面试冲刺 + M4 扩展与前沿）。

共 32 章（M0–M5），每章 = kicker + 讲解 + 交互实验室 + 要点 + 完成按钮。M5「Agent 核心补全」覆盖上下文压缩与 checkpoint、模型路由与凭据池、多模态工具、批处理与评测。

## 技术栈

Next.js 16（静态导出）+ React 19 + Tailwind CSS 4。内容以 TypeScript 类型化数据结构嵌入（`src/data/`），进度存 `localStorage`（版本化 key，支持导出 / 导入 / v1 迁移 / 重置），hash 路由。第 19 章内嵌 Pyodide（CPython WebAssembly）沙箱——运行时由 `postinstall` 从 npm 包 vendor 到 `public/pyodide/`，全程离线。

## 本地部署

需要 Node.js ≥ 20.9。

### 1. 开发模式（热更新）

```bash
npm install
npm run dev
```

### 2. 生产模式（静态导出 + 本地静态服务器）

```bash
npm run build   # 产出 out/
npm run start   # http://localhost:3000
```

### 3. Docker 一键部署（nginx）

```bash
docker compose up --build
```

然后访问 http://localhost:8080 。

## 其他命令

| 命令                 | 作用             |
| -------------------- | ---------------- |
| `npm test`           | 运行 Vitest 单测 |
| `npm run lint`       | ESLint 检查      |
| `npm run format`     | Prettier 格式化  |
| `npm run test:watch` | Vitest 监听模式  |

## 目录结构

```
app/            # Next.js App Router 入口（layout / page / globals.css）
src/
  components/   # CourseNav / ChapterRenderer / Quiz / labs/ 各章交互实验室
  data/         # 28 章元数据 + 各章内容数据（类型化 TS，非 MDX）
  hooks/        # useChapter（hash 路由）/ useProgress（进度订阅）
  lib/          # progress.ts（v1 保留）/ progress-v2.ts / judge.ts
scripts/serve.mjs  # npm run start 的静态服务器
tests/          # Vitest（progress v1 + v2 迁移 + judge）
docs/           # 设计 spec 与实现计划
```

## 设计文档

- v2 重设计 spec：`docs/superpowers/specs/2026-07-19-hermes-tutorial-redesign-v2.md`
- v1（Astro Starlight，已废弃）spec：`docs/superpowers/specs/2026-07-19-hermes-tutorial-website-design.md`
- 实现计划：`docs/superpowers/plans/`
