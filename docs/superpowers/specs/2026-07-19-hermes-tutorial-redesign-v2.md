# Hermes Agent 交互式学习教程 —— 重设计方案（v2）

- **日期**：2026-07-19
- **状态**：待确认
- **项目位置**：`/Users/gcz/Projects/my_hermes/hermes-tutorial/`（独立 git 仓库）
- **语言**：中文为主，技术术语保留英文

---

## 1. 为什么重做

v1（Astro Starlight）的根本问题：**Starlight 是文档框架，不是学习平台**。

| | v1（已废弃） | v2（本方案） |
|---|---|---|
| 框架 | Starlight（文档模板） | Next.js 16（完全控制） |
| 设计 | 默认主题，零辨识度 | 自定义设计语言（印刷/终端风格） |
| 内容深度 | 2 页浅层描述 | ~28 章，每章映射真实源码 |
| 交互形态 | MDX 页面中嵌入组件 | 单页沉浸式应用，交互是主体 |
| 架构 | 页面驱动（静态生成） | 状态驱动（客户端交互实验室） |
| 进度 | localStorage 计数 | localStorage 持久化 + 导出/导入 + 迁移 |

参考基准：[pi-learning](https://pi.dev/)（Next.js + Tailwind，28 章交互教材，源码级深度）

---

## 2. 架构

- **框架**：Next.js 16 + React 19 + Tailwind CSS 4
- **渲染**：客户端驱动（`"use client"`），无 SSR 依赖（纯本地部署，SEO 非目标）
- **导航**：固定左侧边栏（268px）+ 右侧滚动内容区
- **内容**：全部以 TypeScript 类型化数据结构嵌入（`src/data/` 目录），不通过 CMS/文件系统读取。未来可对接 Hermes 仓库做自动/半自动同步
- **进度**：`localStorage`（版本化 key，带迁移），按章节/实验/测验/最后位置分别记录，支持导出/导入/重置
- **部署**：`npm run dev` / `npm run build && npm run start` / `docker compose up`

### 文件结构（目标）

```
hermes-tutorial/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # 单页应用入口（"use client"）
│   └── globals.css
├── src/
│   ├── components/
│   │   ├── CourseNav.tsx      # 左侧固定导航 + 进度
│   │   ├── ChapterRenderer.tsx # 根据 chapter id 渲染不同交互形态
│   │   ├── Quiz.tsx           # 测验卡片 + 即时反馈
│   │   └── labs/              # 各章节的交互实验室
│   │       ├── ArchitectureLab.tsx
│   │       ├── AgentLoopLab.tsx
│   │       ├── SkillCuratorLab.tsx
│   │       ├── ToolRoutingLab.tsx
│   │       ├── MemoryLab.tsx
│   │       ├── DelegationLab.tsx
│   │       ├── CronKanbanLab.tsx
│   │       ├── GatewayLab.tsx
│   │       ├── TUILab.tsx
│   │       ├── ProfilesLab.tsx
│   │       ├── ProviderLab.tsx
│   │       └── InterviewLab.tsx
│   ├── data/
│   │   ├── chapters.ts        # 28 章元数据
│   │   ├── architecture.ts    # 包架构数据
│   │   ├── agent-loop.ts      # Agent 循环步骤
│   │   ├── skills.ts          # 技能系统 + 策展器
│   │   ├── tools.ts           # 工具与 toolsets
│   │   ├── memory.ts          # 记忆与召回
│   │   ├── delegation.ts      # 委派系统
│   │   ├── cron.ts            # Cron + Kanban
│   │   ├── gateway.ts         # 消息网关
│   │   ├── tui.ts             # TUI 架构
│   │   ├── profiles.ts        # 多实例
│   │   └── interview.ts       # 面试题库
│   ├── hooks/
│   │   ├── useProgress.ts     # 进度 store（useSyncExternalStore）
│   │   └── useChapter.ts      # 当前章节路由
│   └── lib/
│       └── progress.ts        # localStorage 持久化（复用 v1 逻辑，升级 v2）
├── public/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── package.json
└── README.md
```

---

## 3. 视觉设计语言

### 色调

| Token | 值 | 用途 |
|---|---|---|
| `--paper` | `#faf8f3` | 主背景 |
| `--paper-deep` | `#f0ece3` | 面板/卡片背景 |
| `--ink` | `#1a1a2e` | 正文色 |
| `--muted` | `#6b7280` | 辅助文字 |
| `--line` | `#d1d5db` | 分割线 |
| `--acid` | `#a3e635` | 主强调（进度/激活态/关键节点） |
| `--ember` | `#f97316` | 辅助强调（警告/标注/kicker） |
| `--blue` | `#3b82f6` | 链接/交互态 |
| `--green` | `#22c55e` | 正确/通过 |
| `--red` | `#ef4444` | 错误/危险 |
| `--white` | `#ffffff` | 卡片/输入背景 |
| `--code-bg` | `#0f172a` | 代码/终端背景 |

### 字体

- 标题：Georgia, "Noto Serif SC", serif（衬线，印刷感）
- 正文：Inter, "Noto Sans SC", ui-sans-serif, sans-serif
- 等宽：JetBrains Mono, "Fira Code", monospace

### 布局

- 左侧导航固定 268px，深色背景（`--ink`），白色文字，酸橙绿进度条
- 右侧内容区 `margin-left: 268px`，全宽滚动
- 每章 `padding: 90px clamp(34px, 6vw, 98px)`（与 pi-learning 一致，留白充足）
- Hero 章首屏全高（`min-height: 100vh`），大标题 `clamp(72px, 9.2vw, 142px)`
- 暗色章节交替穿插（`background: var(--ink); color: var(--white)`），打破视觉单调

---

## 4. 章节结构（28 章，对应 Hermes 真实源码）

按 M0→M4 主线组织，每章 = `kicker + 讲解 + 交互实验室 + 要点 + 完成按钮`。

### M0 · 认识 Hermes（4 章）

| # | 标题 | 核心交互 | 时长 |
|---|---|---|---|
| 00 | 先建立直觉 | Hero + 终端动画展示 `hermes` 命令 | 5 min |
| 01 | 读懂仓库地图 | 包架构浏览器（5 个 package 切换+详情面板，对应 AGENTS.md 的 Project Structure） | 10 min |
| 02 | 功能全景 | 功能矩阵表 + 场景选择器（"理解仓库"/"修改代码"/"解释会话"类似 pi-learning 的 Loop Scenario） | 10 min |
| 03 | 安装与第一次对话 | `<TryIt>` 命令卡片 + 安装检查清单 | 8 min |

### M1 · 深入原理（14 章，对应 AGENTS.md 架构 + 源码）

| # | 标题 | 核心交互 | 时长 |
|---|---|---|---|
| 04 | Agent 主循环 | **Agent 循环步进器**（INPUT→CONTEXT→MODEL→TOOL→RESULT→LOOP，每步展示对应源码+事件流） | 18 min |
| 05 | 技能系统（上） | 技能格式浏览器（skill YAML 结构 + 加载流程 + SkillManager 源码） | 12 min |
| 06 | 技能系统（下）· 策展器 | **策展器状态机可视化**（创建→匹配→调用→评价→改进/淘汰） | 15 min |
| 07 | 工具与 toolsets | **工具路由实验室**（选择 tool/toolset，查看注册→校验→执行→结果流） | 15 min |
| 08 | 记忆与跨会话召回 | **记忆架构图**（FTS5 索引 + LLM 摘要 + Honcho 用户模型 + 检索流程） | 14 min |
| 09 | 委派系统 | **委派时序图**（spawn→task→tool_calls→result→parent 聚合） | 14 min |
| 10 | 消息网关（上） | **网关拓扑图**（Telegram/Discord/Slack/WhatsApp/Signal → gateway → agent） | 12 min |
| 11 | 消息网关（下） | 消息流转 + 语音转录 + 跨平台连续性 | 12 min |
| 12 | Cron 定时调度 | **Cron 表达式实验室**（可视化 cron 解析 + scheduler 调度流程） | 12 min |
| 13 | Kanban 工作队列 | **Kanban 面板模拟**（multi-agent 任务状态流转） | 12 min |
| 14 | TUI 架构 | **终端组件实验**（render(width)→行、invalidate、requestRender、Focusable 输入法） | 15 min |
| 15 | CLI 架构 | CLI 命令树 + 参数解析 + 子命令路由（cli.py 结构） | 12 min |
| 16 | 终端后端 | **6 种后端对比**（local/Docker/SSH/Singularity/Modal/Daytona）+ serverless 休眠/唤醒时序 | 12 min |
| 17 | Profiles 多实例 | 配置文件结构 + 实例隔离模型 | 10 min |

### M2 · 基于原理构建（5 章）

| # | 标题 | 核心交互 | 时长 |
|---|---|---|---|
| 18 | 写一个新技能 | **技能构建器**（YAML 编辑器 + 字段校验 + 预期效果预览） | 20 min |
| 19 | 加一个新工具 | **工具注册实验**（schema 定义→注册→模拟调用→校验结果） | 18 min |
| 20 | 加一个 Provider | **Provider 适配实验**（auth→models→streamSimple→统一事件流） | 18 min |
| 21 | 写一个 Plugin | **Plugin 构建器**（扩展点选择→事件绑定→模拟加载） | 18 min |
| 22 | 从零设计一个新 Agent | **Agent 设计工作台**（定义 loop→tools→memory→skills→deploy 的完整设计卡片） | 25 min |

### M3 · 面试冲刺（4 章）

| # | 标题 | 核心交互 | 时长 |
|---|---|---|---|
| 23 | Agent 循环设计题 | **面试问答卡**（问题+翻转思路+追问链） | 15 min |
| 24 | 多 Agent 协作设计题 | **拓扑选择器**（Manager/Handoff/Supervisor/Group/Swarm 五种模式对比） | 18 min |
| 25 | 系统设计面试 | **Design Doc 模板**（需求→架构→组件→数据→故障→评测） | 20 min |
| 26 | 自我评估与面试清单 | **自评矩阵**（"能讲清/能设计/能答追问"三档 + 知识图谱） | 12 min |

### M4 · 扩展与前沿（2 章）

| # | 标题 | 核心交互 | 时长 |
|---|---|---|---|
| 27 | 可靠性设计 | **故障注入实验室**（429/溢出/abort/部分失败，重试→熔断→补偿→审计） | 18 min |
| 28 | MCP / A2A 互操作 | **协议对比面板**（Pi RPC ↔ MCP ↔ A2A / 参与方 / 传递内容 / 不包括 / 何时用） | 14 min |

---

## 5. 交互实验室详细设计（核心差异化）

每个实验室是客户端 React 状态机，数据从 `src/data/*.ts` 的结构化类型驱动。

### 5.1 包架构浏览器（Chapter 01）

- 左：5 个 package 卡片（agent-core / ai / coding-agent / tui / cli）
- 点击切换右侧详情面板：角色描述 + 职责 + 关键源文件列表 + 依赖关系
- 数据源：hermes-agent 的实际 `AGENTS.md` 包结构 + 真实文件路径

### 5.2 Agent 循环步进器（Chapter 04）

- 左：6 步面板（INPUT / CONTEXT / MODEL / TOOL / RESULT / LOOP），点击步进
- 右：当前步的源码片段（带行号 + 文件路径）+ 对应事件流 + 说明
- 类似 pi-learning 的 Loop Lab 模式

### 5.3 策展器状态机（Chapter 06）

- 状态节点图：IDLE → MATCHING → INVOKED → EVALUATED → IMPROVED / DEPRECATED
- 点击节点查看对应的 curate 逻辑 + 源码位置
- "触发一次策展"模拟按钮

### 5.4 工具路由实验室（Chapter 07）

- 左：工具列表（read/write/edit/bash/search/...）
- 选择一个工具 → 右：schema 定义 → 注册链路 → 执行流程（beforeToolCall→execute→toolResult）→ 并行/串行标志
- 源码映射：`tools/` 目录 + `toolsets.py`

### 5.5 记忆架构图（Chapter 08）

- 四层记忆可视化：Working / Episodic / Semantic / Procedural
- 每层展示：生命周期、存储内容、写入时机、读取时机、Hermes 对应实现、注意事项
- 交互：切换记忆层查看详情

### 5.6 面试问答卡（Chapter 23-26）

- 题库从 `src/data/interview.ts` 驱动
- 每张卡：问题 → 用户思考区 → 点击翻转 → 模范思路 + 追问链 + 评分维度
- 全局评分卡（类似 pi-learning 安全测验的 score card）

---

## 6. 数据模型

所有内容以 TypeScript 类型化数据结构嵌入，不依赖 MDX/Markdown 文件系统。

### 章节元数据

```ts
type ChapterId = string; // "start" | "map" | ... | "interop"

interface Chapter {
  id: ChapterId;
  number: string;   // "00"–"28"
  title: string;
  meta: string;      // "12 min" / "18 min · 进阶"
  module: "M0" | "M1" | "M2" | "M3" | "M4";
  kicker: string;    // 小节标签
  description: string;
  sourceFiles: string[]; // 关联的 hermes-agent 源文件路径
}
```

### 章节内容

每个 chapter 的内容通过 `src/data/<chapter>.ts` 结构化定义，由 `ChapterRenderer.tsx` 按 `id` 路由到对应交互实验室。内容数据格式因章节而异：

- 纯讲解章节：`{ sections: { heading, body }[] }`
- 交互实验室章节：`{ data: Record<Key, LabDatum>, component: "ArchitectureLab" | "LoopLab" | ... }`
- 测验章节：`{ items: QuizItem[] }`
- 面试章节：`{ questions: InterviewQuestion[] }`

---

## 7. 进度系统 v2

复用 v1 的 `localStorage` 架构（版本化 key），扩展维度：

```ts
interface ProgressState {
  version: 2;
  chapters: Record<ChapterId, "not-started" | "reading" | "complete">;
  quizScores: Record<string, { correct: number; total: number; timestamp: number }>;
  labResults: Record<string, unknown>; // 实验室状态快照
  lastPosition: ChapterId;
  lastVisited: number; // timestamp
}
```

- 导出/导入：JSON 文件下载/上传
- 迁移：v1 → v2 自动检测旧 key 并升级
- 重置：确认对话框 + 单独清除或全部清除

---

## 8. 实现阶段

### 阶段 1 · 骨架 + M0 纵切片（当前优先）
- 删除现有 Starlight 项目文件，保留 `docs/` + `tests/lib/progress.test.ts`
- Next.js + Tailwind 项目初始化
- `CourseNav` + 进度条 + 章节切换
- `ChapterRenderer` 路由框架
- Hero（Chapter 00）+ 包架构浏览器（Chapter 01）+ 功能全景（Chapter 02）+ 安装（Chapter 03）
- 进度系统 v2（复用+扩展 progress store 逻辑）
- Docker / CI / README 同步更新
- **DoD**：4 章 M0 可完整浏览，导航切换正常，进度持久化

### 阶段 2 · M1 原理（14 章）
- Agent 循环步进器、策展器状态机、工具路由实验室、记忆架构图、委派时序图、网关拓扑图、Cron 实验室、Kanban 面板、TUI 实验、CLI 命令树、后端对比、Profiles 模型
- 数据源对齐 `AGENTS.md` + 真实源码路径

### 阶段 3 · M2 构建 + M3 面试 + M4 扩展（8 章）
- 技能构建器、工具注册实验、Provider 适配实验、Plugin 构建器、Agent 设计工作台
- 面试问答卡、多 Agent 拓扑选择器、Design Doc 模板、自评矩阵
- 可靠性故障注入实验室、MCP/A2A 协议对比面板

---

## 9. 阶段 1 完成定义（DoD）

- [ ] 旧 Starlight 代码删除，Next.js 项目可 `npm run dev`
- [ ] Tailwind 设计 token（`--paper`/`--ink`/`--acid` 等）全部落地，与 pi-learning 同级视觉品质
- [ ] `CourseNav` 侧边栏：28 章列表、当前章高亮、进度条（完成数/总数）
- [ ] 4 章 M0 内容（00-03）全部可实现交互
- [ ] 进度系统 v2：读写 localStorage、导出/导入 JSON、v1 迁移、重置
- [ ] `npm run build` 产出可用静态资源
- [ ] Dockerfile + docker compose 可一键起 nginx
- [ ] 14 个 Vitest 测试（progress v1 的 7 个 + progress v2 迁移 + judge 保留）+ 新进度测试

---

## 10. 未决

- 真实源码片段是手动摘录还是自动从 hermes-agent 仓库生成快照（参考 pi-learning TODO.md 的 Python 等价版源码集成方案）——阶段 2 决定
- 是否引入暗色/亮色切换（pi-learning 通过交替章节底色实现，无需全局 toggle）——沿用此模式
- 代码执行沙箱（Pyodide/WebContainers）——M2 构建章节可能需要，M2 阶段定
