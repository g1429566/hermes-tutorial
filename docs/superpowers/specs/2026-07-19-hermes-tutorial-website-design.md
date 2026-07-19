# Hermes Agent 交互式学习教程网站 — 设计文档（Spec）

- **日期**：2026-07-19
- **状态**：已确认（待实现规划）
- **项目位置**：`/Users/gcz/Projects/my_hermes/hermes-tutorial/`（与 `hermes-agent/` 同级，独立 git 仓库）
- **内容语言**：中文为主，技术术语保留英文

---

## 1. 主线任务与学习成果（本项目的脊柱）

本项目交付一个**交互式教学网站**，教学对象是 [Hermes Agent](https://github.com/NousResearch/hermes-agent)（Nous Research 出品的自进化 AI agent，Python 实现）。网站与交互是**交付手段**，真正的产品是下面这条**学习成果主线**：

> **了解 Hermes 各项功能 → 深入 Hermes 原理 → 基于原理能自己设计新 agent、扩展 agent 功能 → 达到 AI agent 工程方向的面试要求。**

终点标尺是 **AI agent 工程面试**：学习者要能讲清 agent loop 设计、工具调用机制、记忆/召回策略、多 agent 协作、self-improvement（自进化）的权衡与可扩展性等，并能现场设计 agent、回答追问。

每个概念都教到 **"能讲清楚 + 能设计 + 能答追问"** 的深度。

### 成功标准（围绕学习成果）

- 学习者按主线学完后，能：
  - 复述 Hermes 全部主要功能并说明各自解决什么问题；
  - 在源码级讲清核心模块（agent 主循环、技能系统+策展器、工具/toolsets、记忆与召回、委派、cron/kanban、网关、终端后端、profiles）的工作原理；
  - 动手写出新技能 / 新工具 / 新 provider / 新 plugin，并基于这些模式从零设计一个新 agent；
  - 应对 AI agent 工程方向的典型面试题与设计题。
- 网站本身：可本地一键部署；交互组件服务于上述成果；进度在浏览器本地持久化、可重置；纯静态、无后端、性能良好。

---

## 2. 定位

- **不是**又一份参考文档（官方 Docusaurus 站已有 358 篇）。
- **是**一条有序的、交互式的学习路径，把"会用 → 懂原理 → 能造 → 能面"串成一条主线。
- Hermes 在这里既是**被教学的对象**（了解功能），也是**原理的载体**（深入源码），也是**构建的范本**（扩展/设计）。

---

## 3. 范围与分阶段

学习主线 = 4 个模块（M0–M3）。交付按阶段推进，基础设施（阶段 0）先行并贯穿全程。

| 阶段                      | 内容                                                                               | 说明               |
| ------------------------- | ---------------------------------------------------------------------------------- | ------------------ |
| **0 · 地基 + M0 纵切片**  | 站点骨架、全部交互组件、进度追踪、本地部署、工程化基线；+ 足够的 M0 内容验证端到端 | 本 spec 的实现重点 |
| **1 · M0 全量 + M1 原理** | 认识 Hermes 全功能；逐模块源码级原理                                               | 内容最重的阶段     |
| **2 · M2 构建**           | 写技能/工具/provider/plugin、从零设计 agent                                        | 后续               |
| **3 · M3 面试冲刺**       | 高频题、设计题、自评                                                               | 后续               |

### 本阶段（阶段 0）范围内 / 范围外

**范围内**：Astro+Starlight 项目初始化与目录结构；全部 8 个交互组件（见 §6）的实现；进度追踪（localStorage）；本地部署三档；工程化基线（git、Prettier/ESLint、Vitest、CI 雏形）；M0 的少量示例内容用于端到端验证。

**范围外**：M0–M3 的正式全部课程内容（后续阶段）；自托管 Pyodide wheel（阶段 0 用 CDN）；账户/服务端/多用户（始终纯静态）。

---

## 4. 课程主线设计（产品核心）

每个模块 = `目标 → 讲解（含源码/图）→ 交互练习 → 检查点`。

### M0 · 认识 Hermes（了解各项功能）

- Hermes 是什么、解决什么、核心差异化（**自进化学习循环**）。
- 功能全景：TUI、消息网关（Telegram/Discord/Slack/WhatsApp/Signal）、技能、记忆、cron 定时、委派/子agent、工具与 toolsets、provider/模型切换、6 种终端后端（local/Docker/SSH/Singularity/Modal/Daytona）、profiles 多实例。
- 安装配置、第一次对话。
- 交互：`<TryIt>`（本地终端跑 `hermes` 命令）、`<Quiz>`（功能辨识）。

### M1 · 深入原理（源码级拆解）— 对应 `AGENTS.md` 架构

- **Agent 主循环**（`run_agent.py` / `AIAgent`）：消息流、工具调用循环、流式输出。
- **技能系统 + 策展器**（skill lifecycle, self-improvement loop）：Hermes 的核心差异化——技能如何被创建、匹配、调用、使用中自我改进；agentskills.io 标准。
- **工具与 toolsets**：工具调用机制、toolset 分发。
- **记忆与跨会话召回**：FTS5 会话搜索、LLM 摘要、Honcho dialectic user modeling。
- **委派与子 agent**（`delegate_task`）：并行工作流、RPC 脚本。
- **cron / kanban**：定时调度、多 agent 工作队列。
- **网关与消息**（gateway）：多平台接入、语音转录、跨平台连续性。
- **TUI 架构**（`ui-tui` + `tui_gateway`）。
- **终端后端**：6 种后端的差异与选择（含 serverless 休眠/唤醒）。
- **profiles**：多实例支持。
- 交互：`<SourceRead>`（源码精读）、`<PyDemo>`（算法/概念理解，如技能匹配、工具路由、cron 解析、轨迹压缩）、`<Quiz>`。

### M2 · 基于原理构建（自己设计 agent + 扩展功能）

- 写一个新**技能**（技能格式、curator 如何发现/改进）。
- 加一个新**工具 / toolset**（对应 `AGENTS.md` 的 "Adding New Tools"）。
- 加一个新 **provider / 模型接入**。
- 写一个 **plugin**。
- **从零设计一个新 agent**：基于上述模式组合出一个解决具体问题的 agent。
- 交互：`<BuildExercise>`（带结构校验的动手构建练习）。

### M3 · 面试冲刺（达到面试要求）

- 每个核心概念到面试深度的复盘。
- 高频面试题：agent loop 设计、工具调用、记忆策略、多 agent 协作、self-improvement 权衡、可扩展性、选型理由。
- 设计题演练（"设计一个 X agent"）。
- 自评清单（"能讲清/能设计/能答追问"三档自评）。
- 交互：`<InterviewQ>`（问答 + 模范思路 / 可翻转卡片）、自评 `<Checkpoint>`。

---

## 5. 技术栈决策

| 维度            | 选择                                              | 理由                                                                               |
| --------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 框架            | **Astro + Starlight**                             | 群岛架构：静态内容零 JS，交互组件按需水合；MDX 友好；专为文档/教程设计；性能最佳。 |
| 内容格式        | MDX                                               | 可在 Markdown 中内嵌交互组件。                                                     |
| 群岛 UI 框架    | **React**（Starlight 原生支持，零额外配置）       | 与 Starlight 内部组件一致；按需水合，JS 体积由交互点数量决定。                     |
| 浏览器内 Python | **Pyodide**（CDN 懒加载）                         | WASM 跑纯 Python，支持 pytest 级校验；无后端。服务于 M1 概念理解。                 |
| 进度存储        | 浏览器 `localStorage`                             | 本地、无后端、纯静态站点的唯一合理选择。                                           |
| 样式            | Starlight 主题 + 少量自定义 CSS                   | 复用 Starlight 设计系统，保持一致。                                                |
| 代码编辑器      | **CodeMirror 6**                                  | 轻量、框架无关，用于 `<PyDemo>` / `<BuildExercise>` 的可编辑代码区。               |
| 测试            | Vitest（单测）+ astro build + 链接检查（CI）      | 与 hermes-agent 的 `web/` vitest 配置思路一致。                                    |
| 代码规范        | Prettier + ESLint                                 | 可借鉴 hermes-agent 的 `eslint.config.shared.mjs`。                                |
| 容器            | Dockerfile + docker compose（nginx 托管 `dist/`） | 一键本地"部署"。                                                                   |

### 架构取舍：交互层走"方案 A"（Starlight 原生 + 自定义群岛）

Starlight 出内容骨架（侧边栏/搜索/主题/i18n），交互能力是若干**独立小岛**按需水合。JS 体积最小、内容体验最 Starlight、复杂度中。放弃"一个大 React 应用岛"方案（发更多 JS、弱化文档优势）。

---

## 6. 交互组件清单（全部服务于学习成果）

组件位于 `src/components/`，作为 React 群岛在 MDX 中内嵌。

| 组件                 | 用途                                                                                               | 服务模块 |
| -------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| `<TryIt>`            | 展示一条 `hermes ...` 命令 + 说明 + "我在终端跑过了 ✓" 自评勾选（写进度，**不真正执行**）          | M0       |
| `<Quiz>`             | 单选/多选/填空，即时反馈 + 解释；答对可触发检查点                                                  | M0/M1/M3 |
| `<SourceRead>`       | 带注释源码阅读器：左源码（行号/高亮/锚点），右注释，可折叠                                         | M1       |
| `<PyDemo>`           | Pyodide 运行器：CodeMirror 可编辑 Python + 运行按钮 + 输出区；**懒加载**；支持期望输出校验         | M1       |
| `<BuildExercise>`    | 动手构建练习：编辑器 + 任务说明 + 结构校验（如校验技能文件字段、工具签名）                         | M2       |
| `<InterviewQ>`       | 面试题 + 可折叠模范思路 / 翻转卡片                                                                 | M3       |
| `<Checkpoint>`       | 标记本节/模块完成，写进度                                                                          | 全局     |
| **进度追踪（全局）** | `localStorage` 存已完成节/检查点；侧边栏/顶部进度条；一键重置；作为 Starlight 布局覆盖注入所有页面 | 全局     |

---

## 7. 内容组织与来源

- 顶层是**有序学习路径**（非参考文档平铺）。目录（`src/content/docs/`）按模块分：`m0-overview/`、`m1-internals/`、`m2-build/`、`m3-interview/`；阶段 0 先放 `demo/` 示例页验证组件。
- Starlight sidebar 配置成按模块分组、有序排列，体现 M0→M3 的主线。
- **内容来源**：以 hermes-agent 自身的 `README`/`website/docs`（358 篇）/`AGENTS.md`/源码为素材，**提炼改写**为中文学习路径（非直接复制）。

---

## 8. 数据流

- **构建时**：Astro 读 MDX → 静态 HTML + 群岛占位符；输出到 `dist/`。
- **运行时（纯前端，无后端）**：
  - 群岛水合 → 用户交互 → Pyodide 从 CDN 懒加载（仅 `<PyDemo>`/`<BuildExercise>` 需要）→ WASM 执行 → 输出渲染。
  - 测验判定 / 检查点 / `<TryIt>` 勾选 / 自评 → 读写 `localStorage` → 进度条更新。
- **无任何服务端调用**：站点是纯静态资源。

---

## 9. 本地部署（三档，写进 README）

1. **开发**：`npm run dev`（Vite dev server，热更新）。
2. **预览**：`npm run build && npm run preview`（或 `npx serve dist`）。
3. **一键容器**：`docker compose up`（构建 `dist/` 后由 nginx 托管）。

最低 Node 版本由 `package.json` `engines` 固定。

---

## 10. 错误处理与边界

- **Pyodide 能力边界（关键约束）**：只能跑纯标准库 / 轻量包的概念 demo（技能匹配、工具路由、cron 解析、轨迹压缩等）。Hermes 依赖的真实文件系统 / 子进程 / LLM API **跑不了**——这类一律用 `<TryIt>` 引导本地真跑或用 `<BuildExercise>` 在本地环境构建。内容设计须明确划线，避免给学习者错误预期。
- **Pyodide 加载失败 / 离线**：降级为只读代码展示 + 提示"首次需联网加载"。后续阶段可自托管 wheel。
- **代码运行异常**：捕获 Python 异常，友好展示 traceback，不影响页面其他部分。
- **`localStorage` 不可用**（隐私模式等）：进度功能静默降级，内容仍完全可读。
- **构建失败 / 链接失效**：CI 中 `astro build` + 链接检查器拦截。

---

## 11. 测试策略

- **组件单测（Vitest）**：
  - `<PyDemo>`：懒加载触发、降级路径、错误展示、期望输出校验逻辑。
  - `<BuildExercise>`：结构校验逻辑（技能字段、工具签名等）。
  - `<Quiz>`：单选/多选/填空判定。
  - 进度模块：localStorage 读写、不可用时降级、重置。
- **内容正确性（CI 脚本）**：每个 `<PyDemo>` 预置代码在 CI 用真实 CPython 跑一遍，校验期望输出。
- **构建与链接**：`astro build` 成功 + 链接检查器无死链。
- **手动验证**：本地 `npm run dev` 跑通每个组件的 demo 页 + M0 纵切片。

---

## 12. 工程化约定

- **git**：独立仓库（已 `git init -b main`）；约定式 commit；阶段 0 提交粒度按组件/模块切分。
- **目录结构**：
  ```
  hermes-tutorial/
  ├── docs/                     # 设计文档（本 spec）
  ├── src/
  │   ├── components/           # 交互组件（TryIt/Quiz/SourceRead/PyDemo/BuildExercise/InterviewQ/Checkpoint/Progress）
  │   ├── content/docs/         # MDX 学习内容（按模块 m0–m3 分）
  │   ├── layouts/              # Starlight 布局覆盖（注入进度条）
  │   └── lib/                  # 进度、Pyodide 封装、校验逻辑等纯逻辑
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

## 13. 阶段 0 完成定义（Definition of Done）

- [ ] Astro + Starlight 项目可 `npm run dev` 启动，首页与按模块分组的导航正常。
- [ ] 8 个交互组件全部实现，各有 demo 页可演示。
- [ ] 进度追踪在 localStorage 持久化、可重置，进度条在布局中可见。
- [ ] M0 纵切片内容上站，端到端跑通（阅读 → `<TryIt>`/`<Quiz>` → `<Checkpoint>` → 进度更新）。
- [ ] `npm run build` 产出 `dist/`，`npm run preview` 可访问。
- [ ] Dockerfile + docker compose 可一键起 nginx 托管。
- [ ] Vitest 单测覆盖关键逻辑并通过；示例代码 CI 校验通过。
- [ ] README 写清三档本地部署方式 + 主线任务说明。
- [ ] Prettier/ESLint 通过。

---

## 14. 未决事项 / 后续

- M0–M3 各模块的详细课纲（各阶段开始前再细化）。
- 自托管 Pyodide wheel（若目标网络对 CDN 不稳定）。
- `<BuildExercise>` 的校验深度（纯前端结构校验 vs. 接入本地 hermes 环境实跑）——M2 阶段定。
- 是否引入轻量前端 bundle 预算，待阶段 0 跑起来后评估。
