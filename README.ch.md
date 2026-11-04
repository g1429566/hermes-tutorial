# Hermes Agent 学习教程

[English](README.md) | **中文**

围绕 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的 34 章双语交互教程。先用完整讲解建立概念，再通过例子、状态推演和交互练习核对理解。

**在线阅读：[Hermes Agent 学习教程](https://g1429566.github.io/hermes-tutorial/)**

当前源码核对基线为 2026 年 11 月 4 日的 [`9302ba9e21`](https://github.com/NousResearch/hermes-agent/commit/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e)。默认值、接口和插件集合随版本变化，具体依据见 [源码记录](content/SOURCES.md)。

## 学什么

| 模块 | 主题                                                      | 章数 |
| ---- | --------------------------------------------------------- | ---- |
| M0   | 安装、第一次任务、能力与仓库地图                          | 4    |
| M1   | 主循环、工具、技能、记忆、自我进化、策展、压缩与 Profiles | 8    |
| M2   | 委派、网关、消息队列、定时任务、看板与终端后端            | 6    |
| M3   | TUI、CLI、技能编写、工具、模型 Provider 与插件            | 6    |
| M4   | 故障处理、模型路由、多模态、评测与互操作                  | 5    |
| M5   | 综合设计、协作选择、设计文档与自评                        | 5    |

记忆讲义完整追踪 `MEMORY.md` / `USER.md` 的保存、固定快照与新会话读取，区分历史检索、技能与可选外部 provider。自我进化章节用 CSV 缺失值的纠正，解释前台学习、后台复盘、写入审批、下次复用与效果验证。

网页模拟不会操作真实 Hermes。本机练习需要实际安装、配置模型与相应工具。原有章节 ID 保留，旧链接及本地学习进度可继续使用；展示编号按新的先修顺序排列。

## 本地运行

需要 Node.js ≥ 20.9。

```bash
npm ci
npm run dev
```

生产构建与静态预览：

```bash
npm run build
npm run start
```

GitHub Pages 使用仓库子路径：

```bash
NEXT_BASE_PATH=/hermes-tutorial npm run build
```

也可以用 `docker compose up --build`，然后打开 `http://localhost:8080`。

## 维护与检查

中文和英文正文分别位于 [content/zh](content/zh) 和 [content/en](content/en)，构建时读入并静态发布。章节目录在 `src/data/chapters.ts`，交互实验在 `src/components/labs/`，对应数据在 `src/data/`。先核对源码、修订正文，再同步实验说明、简介和测验。

```bash
npm run lint
npm run test
npm run build
```

Next.js 静态导出不需要网站后端。正文、模拟和已准备的 Pyodide 教学环境可由静态文件提供；真实模型、工具及外部参考链接需要各自的运行环境或网络。Pyodide 示例使用教学替代模块，不代表完整 Hermes 已在浏览器运行。

推送 `main` 后，GitHub Actions 先检查、构建，再部署 GitHub Pages。

## License

[MIT](LICENSE)
