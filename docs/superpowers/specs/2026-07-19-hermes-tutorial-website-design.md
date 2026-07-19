# Hermes Agent 交互式学习教程网站 — 设计文档（Spec）

- **日期**：2026-07-19
- **状态**：已确认（待实现规划）
- **项目位置**：`/Users/gcz/Projects/my_hermes/hermes-tutorial/`（与 `hermes-agent/` 同级，独立 git 仓库）
- **内容语言**：中文为主，技术术语保留英文

---

## 1. 背景与目标

将 [Hermes Agent](https://github.com/NousResearch/hermes-agent)（Nous Research 出品的自进化 AI agent，Python 实现）转化为一个**可本地部署的交互式学习教程网站**。

它不是又一份参考文档——官方 Docusaurus 站已有 358 篇文档。它的差异化在于：

1. **学习路径导向**：有序章节（目标 → 讲解 → 交互练习 → 检查点），而非平铺的 API 参考。
2. **交互式**：浏览器内可运行的 Python 概念 demo、测验、带注释源码阅读、进度追踪，以及配套本地终端动手步骤。
3. **三轨合一**：既教"用会 Hermes"，也以源码为教材讲"Agent 工程原理"，再用一条引导主线把二者串起来。

### 成功标准

- 学习者能在本地一键跑起站点（`npm run dev` / Docker 任选）。
- 浏览器内能跑通纯 Python 概念 demo（Pyodide），无需后端。
- 进度（已完成节/检查点）在浏览器本地持久化、可重置。
- 内容为中文学习路径，覆盖使用上手与原理两条 track。
- 站点无后端、纯静态可托管，性能良好（Starlight 群岛架构，非交互页面近乎零 JS）。

---

## 2. 范围与分阶段

整体范围较大，拆分为独立可交付的阶段，每阶段各自走 spec → plan → 实现。本 spec 聚焦**整体架构 + 阶段 0（地基）**。

| 阶段 | 内容 | 状态 |
|---|---|---|
| **0 · 地基** | 站点骨架、学习路径导航、进度追踪、交互组件基础设施（Pyodide 运行器、测验、源码阅读器、检查点、终端动手步骤） | 本 spec 重点 |
| **1 · 使用上手 track** | 安装/配置/对话/技能/网关/cron——"用会 Hermes"，配本地终端动手步骤 | 后续 |
| **2 · Agent 工程原理 track** | 以 `AGENTS.md` + 源码为教材，逐模块拆解自进化架构（学习循环、技能系统与策展器、工具调用、委派、cron/kanban、TUI）——Pyodide 概念 demo + 源码精读 + 测验 | 后续 |
| **3 · 引导式路径 + capstone** | 把 1+2 串成"从用到原理"主线，加毕业项目 | 后续 |

### 本阶段（阶段 0）范围内 / 范围外

**范围内**：
- Astro + Starlight 项目初始化与目录结构。
- 6 个交互组件的实现（见 §5）。
- 进度追踪（localStorage）。
- 本地部署三档（dev / preview / Docker）。
- 工程化基线（git、Prettier/ESLint、Vitest、CI 雏形）。
- 少量示例内容用于验证组件（非正式课程内容）。

**范围外（留给后续阶段）**：
- 正式课程内容撰写（使用上手 / 原理 track 的全部章节）。
- 自托管 Pyodide wheel（阶段 0 先用 CDN）。
- 账户体系 / 服务端 / 多用户（本站始终纯静态、无后端）。

---

## 3. 用户与使用场景

- **主用户**：想系统掌握 Hermes（既能用、又懂原理）的开发者与 AI agent 学习者。
- **使用方式**：本地部署，按学习路径顺序阅读 → 在页面内做交互练习 → 在本地终端按 `<TryIt>` 指引真跑 `hermes` 命令 → 完成检查点、看进度增长。
- **离线/降级**：Pyodide 首次需联网加载；离线时 demo 降级为只读展示，内容仍可读。

---

## 4. 技术栈决策

| 维度 | 选择 | 理由 |
|---|---|---|
| 框架 | **Astro + Starlight** | 群岛架构：静态内容零 JS，交互组件按需水合；MDX 友好；专为文档/教程设计；性能最佳。 |
| 内容格式 | MDX | 可在 Markdown 中内嵌交互组件。 |
| 群岛 UI 框架 | **React**（Starlight 原生支持，零额外配置） | 与 Starlight 内部组件一致；群岛架构按需水合，JS 体积主要由交互点数量决定，非 React 本身。 |
| 浏览器内 Python | **Pyodide**（CDN 懒加载） | WASM 跑纯 Python，支持 pytest 级校验；无后端。 |
| 进度存储 | 浏览器 `localStorage` | 本地、无后端、纯静态站点的唯一合理选择。 |
| 样式 | Starlight 主题 + 少量自定义 CSS | 复用 Starlight 设计系统，保持一致。 |
| 测试 | Vitest（单测）+ astro build + 链接检查（CI） | 与 hermes-agent 的 `web/` 已有 vitest 配置思路一致。 |
| 代码规范 | Prettier + ESLint | 可借鉴 hermes-agent 的 `eslint.config.shared.mjs`。 |
| 容器 | Dockerfile + docker compose（nginx 托管 `dist/`） | 一键本地"部署"。 |

### 架构取舍：交互层走"方案 A"

**A. Starlight 原生 + 自定义群岛（采纳）**：Starlight 出内容骨架（侧边栏/搜索/主题/i18n），交互能力是若干独立小岛按需水合。JS 体积最小、内容体验最 Starlight、复杂度中。

放弃的 **B. Starlight + 一个大 React 应用岛**：发更多 JS、弱化文档优势、复杂度更高，对本站性价比低。

---

## 5. 组件清单（阶段 0 交付）

所有组件位于 `src/components/`，作为 Astro/Preact 群岛使用，MDX 中内嵌。

1. **`<PyDemo>` — Pyodide 代码运行器**
   - 可编辑 Python 代码区（**CodeMirror 6**，轻量、框架无关）+ "运行"按钮 + 输出区。
   - **懒加载**：Pyodide 首屏不拉取，点击运行或进入视口才加载；加载中显示状态。
   - 支持"预置代码 + 期望输出"校验（用于练习判定）。
   - 错误：捕获并友好展示 traceback，不崩页。

2. **`<Quiz>` — 测验组件**
   - 单选 / 多选 / 填空；即时反馈 + 正确答案解释。
   - 答对可触发检查点写入。

3. **`<SourceRead>` — 带注释源码阅读器**
   - 左：源码片段（行号、高亮、锚点）；右：注释面板，可折叠。
   - 源码从 hermes-agent 仓库的片段提炼（手动摘录，非运行时读取）。

4. **`<Checkpoint>` — 检查点**
   - 标记本节完成，写入进度；可由 `<Quiz>` 答对或用户手动触发。

5. **`<TryIt>` — 本地终端动手步骤**
   - 展示一条 `hermes ...` 命令 + 说明 + "我在终端跑过了 ✓" 自评勾选（写进度）。
   - **不真正执行命令**，只引导学习者在自己的终端操作。

6. **进度追踪（全局）**
   - `localStorage` 存：已完成节 slug、已通过检查点、`<TryIt>` 勾选项。
   - 侧边栏/顶部进度条；一键重置。
   - 作为 Starlight 布局覆盖（layout override）注入到所有页面。

---

## 6. 内容组织（学习路径）

- 顶层不是参考文档式平铺，而是**有序学习路径**。
- 目录结构（`src/content/docs/`）按 track 分：
  - `get-started/`（阶段 1）
  - `internals/`（阶段 2）
  - `path/`（阶段 3 引导主线）
  - 阶段 0 仅放 `demo/` 示例页验证组件。
- 每章结构：`目标 → 讲解 → 交互练习 → 检查点`。
- Starlight sidebar 配置成按 track 分组、有序排列。
- **内容来源**：从 `hermes-agent/website/docs`（358 篇）+ `AGENTS.md` + 源码**提炼改写**为中文学习路径，非直接复制。

---

## 7. 数据流

- **构建时**：Astro 读 MDX → 生成静态 HTML + 群岛占位符；输出到 `dist/`。
- **运行时（纯前端，无后端）**：
  - 群岛水合 → 用户点击 → Pyodide 从 CDN 懒加载 → WASM 执行代码 → 输出渲染到页面。
  - 测验判定 / 检查点 / `<TryIt>` 勾选 → 读写 `localStorage` → 进度条更新。
- **无任何服务端调用**：站点是纯静态资源。

---

## 8. 本地部署（三档）

1. **开发**：`npm run dev`（Vite dev server，热更新）。
2. **预览**：`npm run build && npm run preview`（或 `npx serve dist`）。
3. **一键容器**：`docker compose up`（构建 `dist/` 后由 nginx 托管）。

三者均写入 README，并标注最低 Node 版本（`package.json` `engines` 固定）。

---

## 9. 错误处理与边界

- **Pyodide 能力边界（关键约束）**：只能跑纯标准库 / 轻量包的概念 demo（技能匹配、工具调用循环、轨迹解析等）。Hermes 依赖的真实文件系统 / 子进程 / LLM API **跑不了**——这类内容一律用 `<TryIt>` 引导在本地真跑。内容设计须明确划线，避免给学习者错误预期。
- **Pyodide 加载失败 / 离线**：降级为只读代码展示 + 提示"首次需联网加载"。后续阶段可自托管 wheel。
- **代码运行异常**：捕获 Python 异常，友好展示 traceback，不影响页面其他部分。
- **`localStorage` 不可用**（隐私模式等）：进度功能静默降级，内容仍完全可读。
- **构建失败 / 链接失效**：CI 中 `astro build` + 链接检查器拦截。

---

## 10. 测试策略

- **组件单测（Vitest）**：
  - `<PyDemo>`：懒加载触发、降级路径、错误展示、期望输出校验逻辑。
  - `<Quiz>`：单选/多选/填空判定。
  - 进度模块：localStorage 读写、不可用时降级、重置。
- **内容正确性（CI 脚本）**：每个 `<PyDemo>` 的预置代码在 CI 用真实 CPython 跑一遍，校验期望输出（防止示例代码错误）。
- **构建与链接**：`astro build` 成功 + Starlight/astro 链接检查器无死链。
- **手动验证**：本地 `npm run dev` 跑通每个组件的 demo 页。

---

## 11. 工程化约定

- **git**：独立仓库（已 `git init -b main`）；约定式 commit；阶段 0 提交粒度按组件切分。
- **目录结构**：
  ```
  hermes-tutorial/
  ├── docs/                     # 本 spec 所在的设计文档
  ├── src/
  │   ├── components/           # 交互组件（PyDemo/Quiz/SourceRead/Checkpoint/TryIt/Progress）
  │   ├── content/docs/         # MDX 学习内容（按 track 分）
  │   ├── layouts/              # Starlight 布局覆盖（注入进度条）
  │   └── lib/                  # 进度、Pyodide 封装等纯逻辑
  ├── public/                   # 静态资源
  ├── scripts/                  # 内容/示例代码校验脚本
  ├── Dockerfile
  ├── docker-compose.yml
  ├── astro.config.mjs
  ├── package.json
  └── README.md
  ```
- **代码规范**：Prettier + ESLint；Node 版本固定（`engines`）。
- **CI**（GitHub Actions 雏形）：lint → 单测 → 示例代码校验 → build + 链接检查。

---

## 12. 阶段 0 完成定义（Definition of Done）

- [ ] Astro + Starlight 项目可 `npm run dev` 启动，首页与导航正常。
- [ ] 6 个交互组件全部实现，各有 demo 页可演示。
- [ ] 进度追踪在 localStorage 持久化、可重置，进度条在布局中可见。
- [ ] `npm run build` 产出 `dist/`，`npm run preview` 可访问。
- [ ] Dockerfile + docker compose 可一键起 nginx 托管。
- [ ] Vitest 单测覆盖关键逻辑并通过；示例代码 CI 校验通过。
- [ ] README 写清三档本地部署方式。
- [ ] Prettier/ESLint 通过。

---

## 13. 未决事项 / 后续

- 正式课程内容（阶段 1/2/3）各自再开 spec。
- 自托管 Pyodide wheel（若 CDN 在目标网络不稳定）。
- 是否引入轻量前端依赖分析（bundle 预算），待阶段 0 跑起来后评估。
