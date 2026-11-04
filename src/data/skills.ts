// Chapter 05「技能系统（上）」+ Chapter 06「技能系统（下）· 策展器」共用数据源。
// 内容对齐 hermes-agent/AGENTS.md 的「Skills」「SKILL.md frontmatter」
// 「Skill authoring standards (HARDLINE)」「Curator (skill lifecycle)」各节。
// frontmatter 示例摘自 skills/software-development/github/SKILL.md 的真实文件
//（description 字段示例摘自 skills/software-development/codebase-inspection/SKILL.md）；
// 加载流程对应 agent/skill_commands.py + tools/skills_tool.py + agent/skill_utils.py；
// 策展逻辑对应 agent/curator.py 与 tools/skill_usage.py 的真实实现。

/* ── Chapter 05：SKILL.md frontmatter 字段 ─────────────────────── */

export interface SkillField {
  id: string;
  name: string;
  required: boolean;
  tagline: string;
  purpose: string;
  rules: string[];
  example: string;
}

export const SKILL_FORMAT_INTRO =
  '先看正文怎样指导任务，再用字段浏览器理解名称、描述与可选条件。仓库贡献规范与运行时能否解析是不同的检查。';

export const SKILL_FRONTMATTER_FIELDS: SkillField[] = [
  {
    id: 'name',
    name: 'name',
    required: true,
    tagline: '技能的唯一标识',
    purpose:
      '技能名，也是斜杠命令的来源：/github 就是由 name 派生的。加载器会把名字规范化为小写连字符 slug；' +
      'frontmatter 缺省 name 时回退到目录名。',
    rules: [
      '全小写、连字符分隔（slugify_skill_name() 把空格/下划线转成连字符，其余非法字符直接剔除）',
      '不同技能的 name 规范化后不得撞车——同名 slug 只会注册出一个命令',
      '目录名最好与 name 一致，便于人肉检索',
    ],
    example: 'name: github',
  },
  {
    id: 'description',
    name: 'description',
    required: true,
    tagline: '≤ 60 字符的一句话',
    purpose:
      '出现在技能列表与斜杠命令补全里，也是模型判断「要不要用这个技能」的主要依据。' +
      '写得越长，技能列表越臃肿，模型的注意力越被稀释。',
    rules: [
      '≤ 60 个字符（AGENTS.md 给了断言脚本逐个验收）',
      '一句话，以句号结尾',
      '只说能力，不说实现；禁用营销词（powerful / comprehensive / seamless / advanced）',
      '不要重复技能名本身',
    ],
    example: 'description: "Inspect codebases w/ pygount: LOC, languages, ratios."',
  },
  {
    id: 'version',
    name: 'version',
    required: false,
    tagline: '语义化版本号',
    purpose: '技能自身的版本，随内容演进递增，便于追踪「这个技能是哪一版」。',
    rules: ['语义化三段式（如 2.0.0）', '内容有实质变更就 bump'],
    example: 'version: 2.0.0',
  },
  {
    id: 'author',
    name: 'author',
    required: false,
    tagline: '人类署名在前',
    purpose: '署名规则是硬性的：外部贡献者的真名 + GitHub handle 写在第一位。',
    rules: [
      '人类贡献者署名在前，"Hermes Agent" 只能作为次要协作者',
      '若贡献者的 commit 显示作者是 Hermes Agent（用 Hermes 起草的），merge 前要换成真人名字',
      'credit the human, not the tool',
    ],
    example: 'author: Ben Barclay (benbarclay), Hermes Agent',
  },
  {
    id: 'license',
    name: 'license',
    required: false,
    tagline: '许可证',
    purpose: '技能的发布许可证，仓库内置技能一般是 MIT。',
    rules: ['与仓库政策一致的许可证标识（如 MIT）'],
    example: 'license: MIT',
  },
  {
    id: 'platforms',
    name: 'platforms',
    required: false,
    tagline: 'OS 门控列表',
    purpose:
      '声明技能支持的操作系统，加载时由 skill_matches_platform()（agent/skill_utils.py）与 sys.platform 比对，' +
      '不匹配的技能直接不注册命令。',
    rules: [
      '取值是 [linux, macos, windows] 的子集，如 [macos] 或 [linux, macos]',
      '必须与脚本实际 import  audited：用到 fcntl / termios / os.setsid / /proc / osascript / systemctl 等 POSIX-only 原语就要声明',
      '默认姿态：先修成跨平台（tempfile.gettempdir、pathlib、psutil），实在绑平台才收窄',
    ],
    example: 'platforms: [linux, macos, windows]',
  },
  {
    id: 'tags',
    name: 'metadata.hermes.tags',
    required: false,
    tagline: '检索标签',
    purpose:
      'Hermes 扩展元数据：标签，用于技能列表的筛选与检索。顶层 tags: 也被接受，加载器会从 metadata.hermes.* 镜像。',
    rules: ['写在 metadata.hermes 命名空间下', '顶层 tags:/category: 是镜像写法，二者取一'],
    example: `metadata:
  hermes:
    tags: [github, gh, git, pull-requests, issues, code-review, repos, auth, ci]`,
  },
  {
    id: 'category',
    name: 'metadata.hermes.category',
    required: false,
    tagline: '分类',
    purpose:
      '技能分类。仓库内置技能按 category 目录组织（skills/software-development/、skills/devops/ …，' +
      '重依赖分类如 mlops 在 optional-skills/ 下），optional-skills/ 有自己的分类集。',
    rules: ['与目标目录的分类保持一致', '重依赖 / 小众技能应进 optional-skills/ 而不是 skills/'],
    example: `metadata:
  hermes:
    category: software-development`,
  },
  {
    id: 'related',
    name: 'metadata.hermes.related_skills',
    required: false,
    tagline: '相关技能',
    purpose: '声明相关技能列表，帮助模型与用户发现一个工作流里的上下游技能。',
    rules: ['列出真实存在的技能名'],
    example: `metadata:
  hermes:
    related_skills: [codebase-inspection, requesting-code-review]`,
  },
  {
    id: 'config',
    name: 'metadata.hermes.config',
    required: false,
    tagline: '声明所需配置项',
    purpose:
      '技能需要的 config.yaml 设置：存储在 skills.config.<key> 下，setup 向导里提示用户填写，' +
      '技能加载时由 agent/skill_commands.py 的 _inject_skill_config() 注入技能消息。',
    rules: ['只声明技能真正依赖的配置键', '密钥类取值仍走 ~/.hermes/.env，不写进 config'],
    example: `metadata:
  hermes:
    config:
      - key: jira_base_url
        description: "Your Jira base URL"
        default: "https://example.atlassian.net"`,
  },
];

// 真实示例：skills/software-development/github/SKILL.md 的 frontmatter（手动摘录）。
export const SKILL_EXAMPLE_YAML = `---
name: github
description: "GitHub via gh CLI: PRs, issues, reviews, repos, auth."
version: 2.0.0
author: Ben Barclay (benbarclay), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [github, gh, git, pull-requests, issues, code-review, repos, auth, ci]
    category: software-development
    related_skills: [codebase-inspection, requesting-code-review]
---`;

// 正文规范（AGENTS.md「Skill authoring standards」第 5、6 条）。
export const SKILL_BODY_SECTIONS = [
  '# <Skill> Skill 标题 + 2-3 句介绍（做什么、不做什么）',
  '## When to Use',
  '## Prerequisites',
  '## How to Run',
  '## Quick Reference',
  '## Procedure',
  '## Pitfalls',
  '## Verification',
];

export const SKILL_FORMAT_HOOK =
  'frontmatter 是契约，正文是知识。description 守住 60 字符，platforms 对得上脚本 import，' +
  '脚本进 scripts/、参考进 references/、模板进 templates/——剩下的交给加载器。';

/* ── Chapter 05：技能加载流程（Stepper） ───────────────────────── */

export interface SkillLoadStep {
  id: string;
  label: string;
  title: string;
  body: string;
  code: { file: string; lines: string; snippet: string; note?: string };
  points: string[];
}

export const SKILL_LOAD_STEPS: SkillLoadStep[] = [
  {
    id: 'scan',
    label: '扫描',
    title: '扫描 skills 目录',
    body: 'agent/skill_commands.py 的 scan_skill_commands() 不再自己递归目录——它迭代 tools/skills_tool.py 的共享技能目录 _skill_catalog()：当前 profile 的 ~/.hermes/skills/（SKILLS_DIR = HERMES_HOME / "skills"，定义在 tools/skills_tool.py）、config.yaml 里 skills.external_dirs 配置的额外目录、以及项目级 skills/ 目录，按 project > local > external 优先级去重。仓库自带的 skills/ 按 category 子目录组织；optional-skills/ 里的技能要先用 hermes skills install official/<category>/<skill> 显式安装才会出现。',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'scan_skill_commands()',
      snippet:
        'def scan_skill_commands() -> dict[str, dict[str, Any]]:\n    """Scan skill dirs and return {"/skill-name": {name, description, ...}}."""\n    from tools.skills_tool import _get_disabled_skill_names, _skill_catalog\n    disabled = _get_disabled_skill_names()\n    for entry in _skill_catalog():\n        if entry["status"] == "unique":\n            _scan_skill_md(Path(entry["path"]), disabled, seen_names, commands)\n    ...',
      note: 'CLI 与 gateway 共用同一份扫描结果（该文件 docstring 开篇即注明）',
    },
    points: [
      'SKILLS_DIR 走 get_hermes_home()，profile 之间互相隔离',
      '逐个目录找 SKILL.md，找到才算一个技能',
      '被禁用的技能（_get_disabled_skill_names）直接跳过',
    ],
  },
  {
    id: 'parse',
    label: '解析',
    title: '解析 YAML frontmatter',
    body: '_parse_frontmatter(content) 把 SKILL.md 拆成 frontmatter dict 与正文。name 缺省回退到目录名；description 供列表展示；顶层 tags:/category: 会从 metadata.hermes.* 镜像——两种写法加载器都认。',
    code: {
      file: 'agent/skill_commands.py',
      lines: '_scan_skill_md()（_parse_frontmatter 经 tools/skills_tool 再导出）',
      snippet:
        "frontmatter, body = _parse_frontmatter(content)\nname = frontmatter.get('name', skill_md.parent.name)\ndescription = frontmatter.get('description', '')",
      note: 'SKILL.md = YAML frontmatter + Markdown 正文，没有第二条格式',
    },
    points: [
      'frontmatter 是 YAML，正文保持 Markdown 原样',
      'name 缺省 → 用目录名兜底',
      '解析失败的技能不会注册成命令',
    ],
  },
  {
    id: 'gate',
    label: '门控',
    title: 'platforms / 环境门控',
    body: 'skill_matches_platform()（agent/skill_utils.py）拿 frontmatter 的 platforms 列表与 sys.platform 比对，这是硬门；skill_matches_environment() 比对 environments: 声明的运行环境标签（kanban / docker / s6）当前是否就绪，skill_matches_apps() 再查 requires_apps: 声明的 app 本机是否可用。三道检查都在扫描期完成，全过才进命令表——Mac 用户永远看不到只支持 Linux 的技能命令。',
    code: {
      file: 'agent/skill_utils.py',
      lines: 'skill_matches_platform_list()',
      snippet:
        'def skill_matches_platform_list(platforms: Any) -> bool:\n    if not platforms:\n        return True\n    current = sys.platform\n    for platform in platforms:\n        normalized = str(platform).lower().strip()\n        ...',
      note: 'platforms 缺省 = 全平台可用',
    },
    points: [
      'platforms: [linux, macos, windows] 的子集',
      '环境门控：environments: 标签（kanban/docker/s6）不匹配就不展示',
      'app 门控：requires_apps: 声明的 app 不可用就隐藏（fail closed）',
      '门控在扫描期完成，不是调用期才报错',
    ],
  },
  {
    id: 'inject',
    label: '注入',
    title: '注入为 user 消息（缓存友好）',
    body: '显式调用把技能正文作为当前任务材料加入，保留已有系统提示。新增材料仍有 token 成本，保存修订不等于替换所有已读取的旧副本。',
    code: {
      file: 'agent/skill_commands.py',
      lines: '教学伪代码',
      snippet: 'read skill body\nappend current task material',
      note: '实际调用路径请对照此模块。',
    },
    points: ['尽量保持此前请求内容稳定。', '区分安装、发现、读取与执行。'],
  },
  {
    id: 'register',
    label: '注册',
    title: '注册为斜杠命令',
    body: 'get_skill_commands() 把通过门控的技能注册成 /skill-name 命令，CLI 的 prompt_toolkit 补全、gateway 的命令分发、TUI/desktop 的斜杠面板都从这份命令表取数。用户在任意平台敲 /技能名，走到的是同一条注入链路。',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'get_skill_commands()',
      snippet:
        'def get_skill_commands() -> dict[str, dict[str, Any]]:\n    """Return the current skill commands mapping (scan first if\n    empty). Rescans when the platform / profile home / project\n    root changes — each identity is scanned once and cached."""\n    # description 取自 SKILL.md frontmatter，供 /help 与补全展示',
      note: '命令名是 name 规范化后的 slug（小写连字符）',
    },
    points: [
      '一份扫描结果，CLI / gateway / TUI / desktop 多端复用',
      '与内置命令撞名的技能跳过自动注册（仍可用 /skill <name> 显式加载），其余补全自动出现',
      '新增技能 = 丢一个目录进 skills/，无需改任何代码',
    ],
  },
];

/* ── Chapter 06：策展器状态机 ──────────────────────────────────── */

export const CURATOR_INTRO =
  '按给定活动时间推演一次维护。curator 根据托管、保护与闲置规则流转技能；LLM 内容整理默认关闭，逐回合后台复盘另有触发路径。';

export type CuratorStateId = 'active' | 'stale' | 'archived' | 'pinned';

export interface CuratorStateNode {
  id: CuratorStateId;
  name: string;
  tagline: string;
  body: string;
  sources: { path: string; note: string }[];
}

export const CURATOR_STATES: CuratorStateNode[] = [
  {
    id: 'active',
    name: 'active',
    tagline: '正常服役',
    body: '受管技能保持可用。使用、查看与修订等活动影响闲置锚点；活动次数不是正确性评分。',
    sources: [
      {
        path: 'tools/skill_usage.py',
        note: 'bump_use / bump_view / bump_patch 三个计数入口',
      },
      {
        path: 'agent/curator.py',
        note: '自动流转：anchor ≤ stale_cutoff 时 active → stale',
      },
    ],
  },
  {
    id: 'stale',
    name: 'stale',
    tagline: '久未使用',
    body: '在满足条件的维护检查中，受管且未受保护的技能超过 stale 阈值后标记为 stale，默认 14 天。仍可使用，重新活动后可恢复活跃。',
    sources: [
      {
        path: 'agent/curator.py',
        note: 'mark stale / reactivate 的 cutoff 比较',
      },
      {
        path: 'config.yaml · curator.stale_after_days',
        note: '默认 14 天',
      },
    ],
  },
  {
    id: 'archived',
    name: 'archived',
    tagline: '归档可恢复',
    body: '维护检查中，超过归档阈值的符合条件技能移入可恢复归档，默认 30 天；还要考虑宽限、pin 和 cron 引用保护。',
    sources: [
      {
        path: 'tools/skill_usage.py',
        note: 'archive_skill()，.archive/ 扁平布局',
      },
      {
        path: 'config.yaml · curator.archive_after_days',
        note: '默认 30 天',
      },
    ],
  },
  {
    id: 'pinned',
    name: 'pinned',
    tagline: '豁免态（正交标记）',
    body: 'pin 与 state 独立，保护归档相关行为。agent 仍可正常修订内容；需要禁止 agent 改写时用 lock。策展器与逐回合复盘也不是同一机制。',
    sources: [
      {
        path: 'agent/curator.py',
        note: 'pinned 与 cron 引用技能的豁免分支',
      },
      {
        path: 'hermes_cli/curator.py',
        note: 'hermes curator pin / unpin',
      },
    ],
  },
];

// 遥测：~/.hermes/skills/.usage.json 每个技能的记录字段（tools/skill_usage.py，_empty_record()）。
// 注意 last_activity_at 不落盘——由 latest_activity_at() 从三类时间戳现算，是策展锚点。
export const CURATOR_USAGE_FIELDS = [
  {
    name: 'use_count',
    note: '技能被实际使用的次数（bump_use 时 +1）',
  },
  {
    name: 'view_count',
    note: '被 skill_view 查看的次数（bump_view 时 +1）',
  },
  {
    name: 'patch_count',
    note: '被 skill_manage patch/edit 修改的次数（bump_patch 时 +1）',
  },
  {
    name: 'last_used_at / last_viewed_at / last_patched_at',
    note: '三类活动各自的时间戳；最新者即锚点 last_activity_at（现算）',
  },
  {
    name: 'created_at',
    note: '记录创建时间——从未使用的技能以它为锚点（宽限地板）',
  },
  {
    name: 'state',
    note: 'active / stale / archived',
  },
  {
    name: 'pinned',
    note: '豁免标记，正交于 state',
  },
  {
    name: 'created_by',
    note: '策展托管政策标记，不是作者证明；前台创建、后台创建与显式 adopt 的策略不同。',
  },
];

// 铁律（AGENTS.md「Curator (skill lifecycle)」Invariants，逐字对齐）。
export const CURATOR_IRON_RULES = [
  {
    title: '先检查托管与来源',
    body: '默认只管理明确托管的技能；prune_builtins 是内置技能闲置归档的单独选择，不代表将它们交给 LLM 任意整理。',
  },
  {
    title: '归档可恢复',
    body: '归档移入当前 profile 的 skills/.archive/；恢复由相应命令处理，不把它描述成删除。',
  },
  {
    title: '区分 pin 与 lock',
    body: 'pin 保护自动归档相关行为；lock 限制 agent 内容变更。后台复盘与策展器分别受各自规则和审批约束。',
  },
];

// 策展检查模拟：一轮自动流转的输入样本与判定规则。
// 判定逻辑对齐 agent/curator.py 的自动状态流转（apply_automatic_transitions，约 209–261 行）：
// pinned / 非 agent 创建跳过 → anchor ≤ archive 线则归档 → ≤ stale 线则标 stale
// → 重新活跃（anchor 新于 stale 线）的 stale 技能 reactivate → 从未使用且年幼的留宽限。
export interface CuratorSimSkill {
  name: string;
  createdBy: 'agent' | 'user';
  state: 'active' | 'stale';
  pinned: boolean;
  useCount: number;
  lastActivityDays: number; // 距今天数；从未使用的技能即创建天数
  note?: string;
}

export const CURATOR_SIM_CONFIG = {
  staleAfterDays: 14, // curator.stale_after_days 默认值
  archiveAfterDays: 30, // curator.archive_after_days 默认值
  intervalHours: 24 * 7, // curator.interval_hours 默认 7 天一轮
  minIdleHours: 2, // curator.min_idle_hours 默认值
};

export const CURATOR_SIM_SKILLS: CuratorSimSkill[] = [
  {
    name: 'standup-report',
    createdBy: 'agent',
    state: 'active',
    pinned: false,
    useCount: 14,
    lastActivityDays: 12,
  },
  {
    name: 'weekly-review',
    createdBy: 'agent',
    state: 'active',
    pinned: false,
    useCount: 6,
    lastActivityDays: 21,
  },
  {
    name: 'old-scraper',
    createdBy: 'agent',
    state: 'stale',
    pinned: false,
    useCount: 3,
    lastActivityDays: 120,
  },
  {
    name: 'stale-but-used',
    createdBy: 'agent',
    state: 'stale',
    pinned: false,
    useCount: 9,
    lastActivityDays: 2,
    note: '标 stale 后又被用了一次',
  },
  {
    name: 'core-workflow',
    createdBy: 'agent',
    state: 'active',
    pinned: true,
    useCount: 30,
    lastActivityDays: 200,
  },
  {
    name: 'my-handmade-skill',
    createdBy: 'user',
    state: 'active',
    pinned: false,
    useCount: 1,
    lastActivityDays: 150,
  },
  {
    name: 'fresh-draft',
    createdBy: 'agent',
    state: 'active',
    pinned: false,
    useCount: 0,
    lastActivityDays: 10,
    note: '从未使用，创建才 10 天',
  },
];

export const CURATOR_HOOK =
  '先确认由谁托管、哪些保护生效，再按活动锚点判断本次流转；内容是否正确还需要另行核验。';

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const SKILL_FORMAT_INTRO_EN =
  'Start with how the body guides work, then inspect names, descriptions, and conditions. Contribution rules and runtime parsing are separate checks.';

export const SKILL_FRONTMATTER_FIELDS_EN: SkillField[] = [
  {
    id: 'name',
    name: 'name',
    required: true,
    tagline: "The skill's unique identifier",
    purpose:
      'The skill name, and the source of the slash command: /github is derived from name. ' +
      'The loader normalizes names to lowercase hyphenated slugs; when frontmatter omits name, it falls back to the directory name.',
    rules: [
      'All lowercase, hyphen-separated (slugify_skill_name() turns spaces/underscores into hyphens and strips the rest)',
      'Normalized names must not collide — two skills with the same slug register only one command',
      'The directory name should match name, for easy human lookup',
    ],
    example: 'name: github',
  },
  {
    id: 'description',
    name: 'description',
    required: true,
    tagline: 'One sentence, ≤ 60 characters',
    purpose:
      'Shown in the skill list and slash-command completion, and the primary signal the model uses to decide ' +
      '"should I use this skill". The longer it is, the more bloated the skill list and the more diluted the model\'s attention.',
    rules: [
      '≤ 60 characters (AGENTS.md ships an assertion script that checks each one)',
      'One sentence, ending with a period',
      'State the capability, not the implementation; no marketing words (powerful / comprehensive / seamless / advanced)',
      'Do not repeat the skill name itself',
    ],
    example: 'description: "Inspect codebases w/ pygount: LOC, languages, ratios."',
  },
  {
    id: 'version',
    name: 'version',
    required: false,
    tagline: 'Semantic version',
    purpose:
      'The skill\'s own version, bumped as the content evolves, so you can track "which version of this skill is this".',
    rules: [
      'Semantic three-part versioning (e.g. 2.0.0)',
      'Bump on any substantive content change',
    ],
    example: 'version: 2.0.0',
  },
  {
    id: 'author',
    name: 'author',
    required: false,
    tagline: 'Humans get top billing',
    purpose:
      "Attribution is a hard rule: the external contributor's real name + GitHub handle comes first.",
    rules: [
      'Human contributors are credited first; "Hermes Agent" may only appear as a secondary collaborator',
      "If a contributor's commit shows Hermes Agent as author (drafted with Hermes), replace it with the real person's name before merge",
      'credit the human, not the tool',
    ],
    example: 'author: Ben Barclay (benbarclay), Hermes Agent',
  },
  {
    id: 'license',
    name: 'license',
    required: false,
    tagline: 'License',
    purpose: "The skill's distribution license — bundled skills are generally MIT.",
    rules: ['A license identifier consistent with repo policy (e.g. MIT)'],
    example: 'license: MIT',
  },
  {
    id: 'platforms',
    name: 'platforms',
    required: false,
    tagline: 'OS gating list',
    purpose:
      'Declares the operating systems the skill supports. At load time skill_matches_platform() (agent/skill_utils.py) ' +
      'compares it against sys.platform; non-matching skills never get their command registered.',
    rules: [
      'Values are a subset of [linux, macos, windows], e.g. [macos] or [linux, macos]',
      'Must match what the scripts actually import, audited: using POSIX-only primitives like fcntl / termios / os.setsid / /proc / osascript / systemctl requires declaring it',
      'Default posture: fix for cross-platform first (tempfile.gettempdir, pathlib, psutil); only narrow when truly platform-bound',
    ],
    example: 'platforms: [linux, macos, windows]',
  },
  {
    id: 'tags',
    name: 'metadata.hermes.tags',
    required: false,
    tagline: 'Retrieval tags',
    purpose:
      'Hermes extended metadata: tags, used for filtering and searching the skill list. ' +
      'Top-level tags: is also accepted — the loader mirrors it from metadata.hermes.*.',
    rules: [
      'Written under the metadata.hermes namespace',
      'Top-level tags:/category: is the mirrored form; use one or the other',
    ],
    example: `metadata:
  hermes:
    tags: [github, gh, git, pull-requests, issues, code-review, repos, auth, ci]`,
  },
  {
    id: 'category',
    name: 'metadata.hermes.category',
    required: false,
    tagline: 'Category',
    purpose:
      'Skill category. Bundled skills are organized into category directories (skills/software-development/, ' +
      'skills/devops/ …; heavy categories like mlops live under optional-skills/); optional-skills/ has its own category set.',
    rules: [
      "Keep consistent with the target directory's category",
      'Heavy-dependency or niche skills belong in optional-skills/, not skills/',
    ],
    example: `metadata:
  hermes:
    category: software-development`,
  },
  {
    id: 'related',
    name: 'metadata.hermes.related_skills',
    required: false,
    tagline: 'Related skills',
    purpose:
      'Declares related skills, helping the model and users discover upstream/downstream skills in a workflow.',
    rules: ['List skills that actually exist'],
    example: `metadata:
  hermes:
    related_skills: [codebase-inspection, requesting-code-review]`,
  },
  {
    id: 'config',
    name: 'metadata.hermes.config',
    required: false,
    tagline: 'Declares required config',
    purpose:
      'config.yaml settings the skill needs: stored under skills.config.<key>, prompted for in the setup wizard, ' +
      'and injected into the skill message at load time by _inject_skill_config() in agent/skill_commands.py.',
    rules: [
      'Only declare config keys the skill genuinely depends on',
      'Secret values still go in ~/.hermes/.env, never in config',
    ],
    example: `metadata:
  hermes:
    config:
      - key: jira_base_url
        description: "Your Jira base URL"
        default: "https://example.atlassian.net"`,
  },
];

// 正文规范（章节名为规范原文，只有首条说明需要翻译）。
export const SKILL_BODY_SECTIONS_EN = [
  '# <Skill> Skill title + 2-3 sentence intro (what it does and does not do)',
  '## When to Use',
  '## Prerequisites',
  '## How to Run',
  '## Quick Reference',
  '## Procedure',
  '## Pitfalls',
  '## Verification',
];

export const SKILL_FORMAT_HOOK_EN =
  'The frontmatter is the contract; the body is the knowledge. Keep description within 60 characters, ' +
  'make platforms match the script imports, put scripts in scripts/, references in references/, templates in templates/ — ' +
  'and leave the rest to the loader.';

export const SKILL_LOAD_STEPS_EN: SkillLoadStep[] = [
  {
    id: 'scan',
    label: 'Scan',
    title: 'Scan the skills directories',
    body: 'scan_skill_commands() in agent/skill_commands.py no longer walks directories itself — it iterates the shared skill catalog _skill_catalog() in tools/skills_tool.py: the current profile\'s ~/.hermes/skills/ (SKILLS_DIR = HERMES_HOME / "skills", defined in tools/skills_tool.py), any extra directories configured via skills.external_dirs in config.yaml, and project-level skills/ directories, deduplicated with project > local > external precedence. The repo\'s bundled skills/ are organized into category subdirectories; skills in optional-skills/ only appear after explicit installation via hermes skills install official/<category>/<skill>.',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'scan_skill_commands()',
      snippet:
        'def scan_skill_commands() -> dict[str, dict[str, Any]]:\n    """Scan skill dirs and return {"/skill-name": {name, description, ...}}."""\n    from tools.skills_tool import _get_disabled_skill_names, _skill_catalog\n    disabled = _get_disabled_skill_names()\n    for entry in _skill_catalog():\n        if entry["status"] == "unique":\n            _scan_skill_md(Path(entry["path"]), disabled, seen_names, commands)\n    ...',
      note: 'CLI and gateway share the same scan results (stated at the top of the file docstring)',
    },
    points: [
      'SKILLS_DIR resolves via get_hermes_home(); profiles are isolated from each other',
      'Each directory is checked for SKILL.md — no SKILL.md, no skill',
      'Disabled skills (_get_disabled_skill_names) are skipped outright',
    ],
  },
  {
    id: 'parse',
    label: 'Parse',
    title: 'Parse the YAML frontmatter',
    body: '_parse_frontmatter(content) splits SKILL.md into a frontmatter dict and the body. name falls back to the directory name when omitted; description feeds the list display; top-level tags:/category: are mirrored from metadata.hermes.* — the loader accepts both forms.',
    code: {
      file: 'agent/skill_commands.py',
      lines: '_scan_skill_md() (_parse_frontmatter re-exported via tools/skills_tool)',
      snippet:
        "frontmatter, body = _parse_frontmatter(content)\nname = frontmatter.get('name', skill_md.parent.name)\ndescription = frontmatter.get('description', '')",
      note: 'SKILL.md = YAML frontmatter + Markdown body — there is no second format',
    },
    points: [
      'frontmatter is YAML; the body stays raw Markdown',
      'Missing name → directory name as fallback',
      'Skills that fail to parse never become commands',
    ],
  },
  {
    id: 'gate',
    label: 'Gate',
    title: 'platforms / environment gating',
    body: 'skill_matches_platform() (agent/skill_utils.py) compares the frontmatter platforms list against sys.platform — a hard gate; skill_matches_environment() then matches the runtime-environment tags declared in environments: (kanban / docker / s6) against what is active, and skill_matches_apps() checks every app declared in requires_apps: is available on this host. All three checks run at scan time, and only skills passing all of them enter the command table — a Mac user never sees a Linux-only skill command.',
    code: {
      file: 'agent/skill_utils.py',
      lines: 'skill_matches_platform_list()',
      snippet:
        'def skill_matches_platform_list(platforms: Any) -> bool:\n    if not platforms:\n        return True\n    current = sys.platform\n    for platform in platforms:\n        normalized = str(platform).lower().strip()\n        ...',
      note: 'platforms omitted = available on all platforms',
    },
    points: [
      'A subset of platforms: [linux, macos, windows]',
      'Environment gating: an environments: tag (kanban/docker/s6) that is not active → not shown',
      'App gating: a requires_apps: app that is unavailable → hidden (fail closed)',
      'Gating happens at scan time, not as a call-time error',
    ],
  },
  {
    id: 'inject',
    label: 'Inject',
    title: 'Injected as a user message (cache-friendly)',
    body: 'Explicit invocation adds the skill body as current task material without rewriting the established system prompt. The added material still costs tokens; saving a revision does not replace every earlier copy.',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'Teaching pseudocode',
      snippet: 'read skill body\nappend current task material',
      note: 'Trace the actual invocation path in this module.',
    },
    points: [
      'Preserve earlier request content where possible.',
      'Distinguish installation, discovery, reading, and execution.',
    ],
  },
  {
    id: 'register',
    label: 'Register',
    title: 'Registered as a slash command',
    body: "get_skill_commands() registers the gated skills as /skill-name commands. The CLI's prompt_toolkit completion, the gateway's command dispatch, and the TUI/desktop slash panels all read from this same command table. Typing /skill-name on any platform goes through the same injection path.",
    code: {
      file: 'agent/skill_commands.py',
      lines: 'get_skill_commands()',
      snippet:
        'def get_skill_commands() -> dict[str, dict[str, Any]]:\n    """Return the current skill commands mapping (scan first if\n    empty). Rescans when the platform, profile home, or project\n    root changes — each identity is scanned once and cached."""\n    # description 取自 SKILL.md frontmatter，供 /help 与补全展示',
      note: 'The command name is the normalized slug of name (lowercase, hyphenated)',
    },
    points: [
      'One scan result, reused across CLI / gateway / TUI / desktop',
      'Skills colliding with a built-in command are skipped from auto-registration (still loadable via /skill <name>); everything else appears in completion automatically',
      'Adding a skill = dropping a directory into skills/ — no code changes needed',
    ],
  },
];

export const CURATOR_INTRO_EN =
  'Trace one maintenance check using stated activity times. Management, protection, and inactivity govern transitions. LLM consolidation is off by default; post-turn review is separate.';

export const CURATOR_STATES_EN: CuratorStateNode[] = [
  {
    id: 'active',
    name: 'active',
    tagline: 'In service',
    body: 'Eligible managed skills remain available. Use, view, and patch activity inform the inactivity anchor; activity is not a correctness score.',
    sources: [
      {
        path: 'tools/skill_usage.py',
        note: 'bump_use / bump_view / bump_patch — the three counting entry points',
      },
      {
        path: 'agent/curator.py',
        note: 'Automatic transition: anchor ≤ stale_cutoff moves active → stale',
      },
    ],
  },
  {
    id: 'stale',
    name: 'stale',
    tagline: 'Long unused',
    body: 'At a permitted check, a managed unpinned skill beyond the configured stale threshold is marked stale. Default: 14 days. It remains available and can reactivate after activity.',
    sources: [
      {
        path: 'agent/curator.py',
        note: 'The cutoff comparisons for mark stale / reactivate',
      },
      {
        path: 'config.yaml · curator.stale_after_days',
        note: 'Default: 14 days',
      },
    ],
  },
  {
    id: 'archived',
    name: 'archived',
    tagline: 'Archived, restorable',
    body: 'At a permitted check, long-inactive eligible skills can move to the recoverable archive. Default: 30 days. Grace periods, pinning, and cron references affect eligibility.',
    sources: [
      {
        path: 'tools/skill_usage.py',
        note: 'archive_skill(), with the flat .archive/ layout',
      },
      {
        path: 'config.yaml · curator.archive_after_days',
        note: 'Default: 30 days',
      },
    ],
  },
  {
    id: 'pinned',
    name: 'pinned',
    tagline: 'Exempt (orthogonal flag)',
    body: 'Pinning protects archival-related behavior and is independent of state. Ordinary agent edits can still occur; use a lock to restrict skill mutations. Do not confuse the curator with post-turn learning review.',
    sources: [
      {
        path: 'agent/curator.py',
        note: 'Exemption branches for pinned and cron-referenced skills',
      },
      {
        path: 'hermes_cli/curator.py',
        note: 'hermes curator pin / unpin',
      },
    ],
  },
];

export const CURATOR_USAGE_FIELDS_EN: typeof CURATOR_USAGE_FIELDS = [
  {
    name: 'use_count',
    note: 'Times the skill was actually used (+1 on bump_use)',
  },
  {
    name: 'view_count',
    note: 'Times it was viewed via skill_view (+1 on bump_view)',
  },
  {
    name: 'patch_count',
    note: 'Times it was modified via skill_manage patch/edit (+1 on bump_patch)',
  },
  {
    name: 'last_used_at / last_viewed_at / last_patched_at',
    note: 'Per-activity timestamps; the newest is the anchor last_activity_at (computed, not stored)',
  },
  {
    name: 'created_at',
    note: 'Record creation time — never-used skills anchor on it (grace floor)',
  },
  {
    name: 'state',
    note: 'active / stale / archived',
  },
  {
    name: 'pinned',
    note: 'Exemption flag, orthogonal to state',
  },
  {
    name: 'created_by',
    note: 'Management-policy marker, not authorship proof. Foreground creation, background creation, and explicit adoption differ.',
  },
];

export const CURATOR_IRON_RULES_EN: typeof CURATOR_IRON_RULES = [
  {
    title: 'Check management and origin',
    body: 'Default maintenance governs explicitly managed skills. prune_builtins is a separate archival option, not unrestricted LLM ownership.',
  },
  {
    title: 'Archive recoverably',
    body: 'Archival moves packages under the current profile; restore is a separate operation.',
  },
  {
    title: 'Distinguish pin and lock',
    body: 'Pin protects archival-related behavior; lock restricts agent mutations. Review and curator runs have separate gates.',
  },
];

export const CURATOR_SIM_SKILLS_EN: CuratorSimSkill[] = [
  {
    name: 'standup-report',
    createdBy: 'agent',
    state: 'active',
    pinned: false,
    useCount: 14,
    lastActivityDays: 12,
  },
  {
    name: 'weekly-review',
    createdBy: 'agent',
    state: 'active',
    pinned: false,
    useCount: 6,
    lastActivityDays: 21,
  },
  {
    name: 'old-scraper',
    createdBy: 'agent',
    state: 'stale',
    pinned: false,
    useCount: 3,
    lastActivityDays: 120,
  },
  {
    name: 'stale-but-used',
    createdBy: 'agent',
    state: 'stale',
    pinned: false,
    useCount: 9,
    lastActivityDays: 2,
    note: 'Marked stale, then used once more',
  },
  {
    name: 'core-workflow',
    createdBy: 'agent',
    state: 'active',
    pinned: true,
    useCount: 30,
    lastActivityDays: 200,
  },
  {
    name: 'my-handmade-skill',
    createdBy: 'user',
    state: 'active',
    pinned: false,
    useCount: 1,
    lastActivityDays: 150,
  },
  {
    name: 'fresh-draft',
    createdBy: 'agent',
    state: 'active',
    pinned: false,
    useCount: 0,
    lastActivityDays: 10,
    note: 'Never used, created only 10 days ago',
  },
];

export const CURATOR_HOOK_EN =
  'Check management and protections before inactivity transitions; content correctness requires separate evidence.';

// SkillFormatLab 专属 UI 文案。
export const SKILL_FORMAT_UI = {
  frontmatterTitle: {
    zh: '逐个字段拆开看',
    en: 'Every field, taken apart',
  },
  required: {
    zh: '必填',
    en: 'required',
  },
  optional: {
    zh: '可选',
    en: 'optional',
  },
  rulesHeading: {
    zh: '校验规则',
    en: 'Validation rules',
  },
  exampleNote: {
    zh: '格式示例；贡献时按当前规范核对',
    en: 'Format example; check current contribution rules',
  },
  realFrontmatterHeading: {
    zh: '一个 frontmatter 示例',
    en: 'A frontmatter example',
  },
  bodySpecHeading: {
    zh: '正文规范：现代章节顺序（HARDLINE 第 5 条）',
    en: 'Body spec: modern section order (HARDLINE rule 5)',
  },
  bodySpecNote: {
    zh: '复杂技能目标 ~200 行，简单技能 ~100 行；脚本进 scripts/、参考进 references/、模板进 templates/。',
    en: 'Target ~200 lines for complex skills, ~100 for simple ones; scripts go in scripts/, references in references/, templates in templates/.',
  },
  loadKicker: {
    zh: '加载流程',
    en: 'Loading pipeline',
  },
  loadTitle: {
    zh: '从磁盘到斜杠命令：五步',
    en: 'From disk to slash command: five steps',
  },
  hookKicker: {
    zh: '要点回顾',
    en: 'Key idea',
  },
  hookTitle: {
    zh: '一句话记住技能格式',
    en: 'The skill format in one sentence',
  },
};

// SkillCuratorLab 专属 UI 文案（含 judge() 的判定理由模板）。
export const CURATOR_UI = {
  stateKicker: { zh: '状态机', en: 'State machine' },
  stateTitle: {
    zh: 'active → stale → archived（pinned 豁免）',
    en: 'active → stale → archived (pinned exempt)',
  },
  daysIdle: {
    zh: (d: number) => `${d} 天无活动`,
    en: (d: number) => `${d} days idle`,
  },
  reactivateNote: {
    zh: 'stale 期间重新使用 → reactivate 回 active',
    en: 'used again while stale → reactivated to active',
  },
  exemptHeading: {
    zh: '豁免态（与 state 正交的布尔标记，不是第四个状态）',
    en: 'Exempt state (a boolean flag orthogonal to state, not a fourth state)',
  },
  sourcesHeading: { zh: '源码位置', en: 'Source locations' },
  telemetryKicker: { zh: '遥测', en: 'Telemetry' },
  telemetryTitle: { zh: '.usage.json：策展器的眼睛', en: ".usage.json: the curator's eyes" },
  usageCaption: {
    zh: '~/.hermes/skills/.usage.json · 每技能一条记录（tools/skill_usage.py）',
    en: '~/.hermes/skills/.usage.json · one record per skill (tools/skill_usage.py)',
  },
  usageNote: {
    zh: 'state 是生命周期状态；created_by 是托管政策，其他来源还有各自规则',
    en: 'state tracks lifecycle; created_by records management policy, with separate source-specific rules',
  },
  simKicker: { zh: '模拟', en: 'Simulation' },
  simTitle: { zh: '触发一次策展检查', en: 'Run a curation check' },
  simDesc: {
    zh: (count: number, stale: number, archive: number, days: number) =>
      `按下按钮，对下面 ${count} 个样本技能跑一轮自动流转判定（已假设托管与调度检查通过；只模拟闲置流转，阈值：stale_after_days=${stale}、archive_after_days=${archive}；${days} 天是默认检查间隔，并非到点保证执行）。`,
    en: (count: number, stale: number, archive: number, days: number) =>
      `Press the button to run one automatic transition pass over the ${count} sample skills below (management and scheduling checks are assumed satisfied; simplified inactivity thresholds: stale_after_days=${stale}, archive_after_days=${archive}; ${days} days is the default interval, not guaranteed execution).`,
  },
  runButton: { zh: '▶ 触发一次策展检查', en: '▶ Run a curation check' },
  reset: { zh: '重置', en: 'Reset' },
  simSummary: {
    zh: (total: number, changed: number) => `检查 ${total} 个技能 · ${changed} 个发生流转`,
    en: (total: number, changed: number) => `${total} skills checked · ${changed} transitioned`,
  },
  thSkill: { zh: '技能', en: 'Skill' },
  thLastActivity: { zh: '最近活动', en: 'Last activity' },
  thState: { zh: '当前状态', en: 'Current state' },
  thDecision: { zh: '判定结果', en: 'Decision' },
  daysAgo: {
    zh: (d: number) => `${d} 天前`,
    en: (d: number) => `${d}d ago`,
  },
  transitioned: { zh: '← 流转', en: '← moved' },
  rulesKicker: { zh: '铁律', en: 'Iron rules' },
  rulesTitle: { zh: '三项维护边界', en: 'Three maintenance boundaries' },
  ruleLabel: {
    zh: (i: number) => `铁律 ${i}`,
    en: (i: number) => `Rule ${i}`,
  },
  hookKicker: { zh: '要点回顾', en: 'Key idea' },
  hookTitle: { zh: '一句话记住策展器', en: 'The curator in one sentence' },
  reasonNotAgent: {
    zh: '本例未纳入托管，跳过闲置流转；实际内置归档另有可选策略',
    en: 'Unmanaged in this example; bundled archival has a separate opt-in policy',
  },
  reasonPinned: {
    zh: '本例 pinned，跳过闲置流转；它不是编辑锁',
    en: 'Pinned in this example: skip inactivity transitions; this is not an edit lock',
  },
  reasonGrace: {
    zh: (anchor: number) => `从未使用且创建仅 ${anchor} 天——宽限地板：没有使用证据 ≠ 该归档`,
    en: (anchor: number) =>
      `Never used and created only ${anchor} days ago — grace floor: no evidence of use ≠ archive-worthy`,
  },
  reasonArchive: {
    zh: (anchor: number, archive: number) =>
      `${anchor} 天无活动 ≥ archive_after_days（${archive}）——归档到 .archive/（可恢复）`,
    en: (anchor: number, archive: number) =>
      `${anchor} days idle ≥ archive_after_days (${archive}) — archived to .archive/ (restorable)`,
  },
  reasonMarkStale: {
    zh: (anchor: number, stale: number) =>
      `${anchor} 天无活动 ≥ stale_after_days（${stale}）——标记 stale`,
    en: (anchor: number, stale: number) =>
      `${anchor} days idle ≥ stale_after_days (${stale}) — marked stale`,
  },
  reasonStayStale: {
    zh: (anchor: number) => `${anchor} 天无活动——维持 stale，等待归档线`,
    en: (anchor: number) => `${anchor} days idle — stays stale, awaiting the archive line`,
  },
  reasonReactivate: {
    zh: (anchor: number) => `最近活动仅 ${anchor} 天前，新于 stale 线——reactivate 回 active`,
    en: (anchor: number) =>
      `Last activity only ${anchor} days ago, newer than the stale line — reactivated to active`,
  },
  reasonHealthy: {
    zh: (anchor: number) => `最近活动仅 ${anchor} 天前——保持健康`,
    en: (anchor: number) => `Last activity only ${anchor} days ago — still healthy`,
  },
};
