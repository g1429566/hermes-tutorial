# Learn Hermes Agent

**English** | [中文](README.ch.md)

A bilingual, 34-chapter interactive course about [Hermes Agent](https://github.com/NousResearch/hermes-agent). Read the explanation first, trace an example, then use exercises and simulations to check understanding.

**Read online: [Hermes Agent Tutorial](https://g1429566.github.io/hermes-tutorial/)**

The source baseline is [`9302ba9e21`](https://github.com/NousResearch/hermes-agent/commit/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e), checked on November 4, 2026. Interfaces, defaults, and plugin inventories are versioned; see the [source record](content/SOURCES.md).

## Course

| Module | Topics                                                                         | Chapters |
| ------ | ------------------------------------------------------------------------------ | -------- |
| M0     | Installation, first task, capabilities, repository map                         | 4        |
| M1     | Loop, tools, skills, memory, self-improvement, curation, compression, profiles | 8        |
| M2     | Delegation, messaging, queues, schedules, boards, terminal backends            | 6        |
| M3     | TUI, CLI, skill authoring, tools, model providers, plugins                     | 6        |
| M4     | Failure handling, routing, media, evaluation, interoperability                 | 5        |
| M5     | System design, collaboration choices, design documents, self-assessment        | 5        |

The memory lesson traces `MEMORY.md` / `USER.md` writes, frozen snapshots, and fresh sessions, separating built-in memory from history, skills, and optional providers. Self-improvement follows a corrected CSV procedure through foreground learning, background review, approval, later use, and evaluation.

Web simulations do not control a real Hermes instance. Local exercises require installation, model access, and relevant tools. Stable chapter IDs preserve existing links and saved progress while display numbers follow the prerequisite order.

## Run locally

Requires Node.js ≥ 20.9.

```bash
npm ci
npm run dev
```

Build and serve the static export:

```bash
npm run build
npm run start
```

For the GitHub Pages subpath:

```bash
NEXT_BASE_PATH=/hermes-tutorial npm run build
```

Alternatively, run `docker compose up --build` and open `http://localhost:8080`.

## Authoring and validation

[content/zh](content/zh) and [content/en](content/en) contain the source prose, read at build time. Chapter metadata lives in `src/data/chapters.ts`; labs live in `src/components/labs/` with their data in `src/data/`. Verify source behavior and revise prose before updating lab descriptions, metadata, and questions.

```bash
npm run lint
npm run test
npm run build
```

The Next.js static export needs no application backend. Prose, simulations, and vendored Pyodide examples can be served as static files. Real model/tool exercises and external references require their own environment or network. Pyodide uses teaching stubs; it is not a full Hermes runtime in a browser.

Pushing `main` runs validation and a build before deploying GitHub Pages.

## License

[MIT](LICENSE)
