// Chapter 05「技能系统（上）」+ Chapter 06「技能系统（下）· 策展器」共用数据源。
// 内容对齐 hermes-agent/AGENTS.md 的「Skills」「SKILL.md frontmatter」
// 「Skill authoring standards (HARDLINE)」「Curator (skill lifecycle)」各节。
// frontmatter 示例摘自 skills/github/github-auth/SKILL.md 的真实文件；
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
  'Hermes 的技能就是一份带 YAML frontmatter 的 Markdown 文件（SKILL.md）：frontmatter 告诉加载器' +
  '「我是谁、能在什么平台跑、需要哪些配置」，正文告诉模型「怎么做」。下面逐个拆开 frontmatter 的每个字段，' +
  '看它的用途与合并前必须通过的校验规则——这些规则写在 AGENTS.md 的「Skill authoring standards (HARDLINE)」里，' +
  'reviewer 会直接拒绝违规的 PR。';

export const SKILL_FRONTMATTER_FIELDS: SkillField[] = [
  {
    id: 'name',
    name: 'name',
    required: true,
    tagline: '技能的唯一标识',
    purpose:
      '技能名，也是斜杠命令的来源：/github-auth 就是由 name 派生的。加载器会把名字规范化为小写连字符 slug；' +
      'frontmatter 缺省 name 时回退到目录名。',
    rules: [
      '全小写、连字符分隔（加载器会把非法字符清洗成连字符）',
      '不同技能的 name 规范化后不得撞车——同名 slug 只会注册出一个命令',
      '目录名最好与 name 一致，便于人肉检索',
    ],
    example: 'name: github-auth',
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
    example: 'description: "GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login."',
  },
  {
    id: 'version',
    name: 'version',
    required: false,
    tagline: '语义化版本号',
    purpose: '技能自身的版本，随内容演进递增，便于追踪「这个技能是哪一版」。',
    rules: ['语义化三段式（如 1.1.0）', '内容有实质变更就 bump'],
    example: 'version: 1.1.0',
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
    example: 'author: Hermes Agent',
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
    tags: [GitHub, Authentication, Git, gh-cli, SSH, Setup]`,
  },
  {
    id: 'category',
    name: 'metadata.hermes.category',
    required: false,
    tagline: '分类',
    purpose:
      '技能分类。仓库内置技能按 category 目录组织（skills/github/、skills/mlops/ …），optional-skills/ 有自己的分类集。',
    rules: ['与目标目录的分类保持一致', '重依赖 / 小众技能应进 optional-skills/ 而不是 skills/'],
    example: `metadata:
  hermes:
    category: github`,
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
    related_skills: [github-pr-workflow, github-code-review, github-issues]`,
  },
  {
    id: 'config',
    name: 'metadata.hermes.config',
    required: false,
    tagline: '声明所需配置项',
    purpose:
      '技能需要的 config.yaml 设置：存储在 skills.config.<key> 下，setup 向导里提示用户填写，技能加载时注入。' +
      'agent/skill_preprocessing.py 负责展开这些配置变量。',
    rules: ['只声明技能真正依赖的配置键', '密钥类取值仍走 ~/.hermes/.env，不写进 config'],
    example: `metadata:
  hermes:
    config:
      jira_base_url: "https://example.atlassian.net"`,
  },
];

// 真实示例：skills/github/github-auth/SKILL.md 的 frontmatter（手动摘录）。
export const SKILL_EXAMPLE_YAML = `---
name: github-auth
description: "GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login."
version: 1.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GitHub, Authentication, Git, gh-cli, SSH, Setup]
    related_skills: [github-pr-workflow, github-code-review, github-issues]
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
    body: 'agent/skill_commands.py 的 scan_skill_commands() 扫描 ~/.hermes/skills/（SKILLS_DIR = HERMES_HOME / "skills"，定义在 tools/skills_tool.py），外加 config.yaml 里 skills.external_dirs 配置的额外目录。仓库自带的 skills/ 按 category 子目录组织；optional-skills/ 里的技能要先用 hermes skills install 显式安装才会出现。',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'scan_skill_commands()',
      snippet: `def scan_skill_commands() -> Dict[str, Dict[str, Any]]:
    """Scan ~/.hermes/skills/ and return a mapping of /command -> skill info."""
    from tools.skills_tool import (
        SKILLS_DIR, _parse_frontmatter,
        skill_matches_platform, skill_matches_environment,
        _get_disabled_skill_names,
    )
    for skill_md in skills_dir.rglob("SKILL.md"):
        ...`,
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
      file: 'tools/skills_tool.py',
      lines: '_parse_frontmatter()',
      snippet: `frontmatter, body = _parse_frontmatter(content)
name = frontmatter.get('name', skill_md.parent.name)
description = frontmatter.get('description', '')`,
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
    body: 'skill_matches_platform()（agent/skill_utils.py）拿 frontmatter 的 platforms 列表与 sys.platform 比对；skill_matches_environment() 再检查技能声明的环境变量是否就绪。两道门都过，技能才会进入命令表——Mac 用户永远看不到只支持 Linux 的技能命令。',
    code: {
      file: 'agent/skill_utils.py',
      lines: 'skill_matches_platform_list()',
      snippet: `def skill_matches_platform_list(platforms: Any) -> bool:
    if not platforms:
        return True
    current = sys.platform
    for platform in platforms:
        normalized = str(platform).lower().strip()
        ...`,
      note: 'platforms 缺省 = 全平台可用',
    },
    points: [
      'platforms: [linux, macos, windows] 的子集',
      '环境门控：需要的 env var 没配就不展示',
      '门控在扫描期完成，不是调用期才报错',
    ],
  },
  {
    id: 'inject',
    label: '注入',
    title: '注入为 user 消息（缓存友好）',
    body: '用户敲 /github-auth 时，_build_skill_message() 把 SKILL.md 正文加上脚手架包成一条 user 消息进入对话——绝不改写 system prompt。AGENTS.md 开宗明义：per-conversation prompt caching is sacred，任何中途改写 past context 的行为都会让缓存失效、成本翻倍。',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'AGENTS.md §CLI Architecture',
      snippet: `# Skill slash commands: agent/skill_commands.py scans
# ~/.hermes/skills/, injects as **user message**
# (not system prompt) to preserve prompt caching
_SKILL_INVOCATION_PREFIX = "[IMPORTANT: The user has invoked the "
_SINGLE_SKILL_MARKER = "The full skill content is loaded below.]"`,
      note: '脚手架标记是字节级稳定的——memory provider 靠它还原用户真实指令',
    },
    points: [
      '注入 user 消息：缓存前缀不动，成本不翻倍',
      '脚手架标记让记忆系统能剥离技能正文、只存用户指令',
      '技能默认「下次会话生效」，--now 才立即破缓存',
    ],
  },
  {
    id: 'register',
    label: '注册',
    title: '注册为斜杠命令',
    body: 'get_skill_commands() 把通过门控的技能注册成 /skill-name 命令，CLI 的 prompt_toolkit 补全、gateway 的命令分发、TUI/desktop 的斜杠面板都从这份命令表取数。用户在任意平台敲 /技能名，走到的是同一条注入链路。',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'get_skill_commands()',
      snippet: `def get_skill_commands() -> Dict[str, Dict[str, Any]]:
    """Rescans ~/.hermes/skills/ and any skills.external_dirs ..."""
    # description 取自 SKILL.md frontmatter，供 /help 与补全展示`,
      note: '命令名是 name 规范化后的 slug（小写连字符）',
    },
    points: [
      '一份扫描结果，CLI / gateway / TUI / desktop 多端复用',
      '技能命令与内置命令同表，补全自动出现',
      '新增技能 = 丢一个目录进 skills/，无需改任何代码',
    ],
  },
];

/* ── Chapter 06：策展器状态机 ──────────────────────────────────── */

export const CURATOR_INTRO =
  'agent 自己写的技能越攒越多，谁来收拾？策展器（curator）是一个后台维护系统：' +
  '它读取每个技能的 .usage.json 遥测，按「多久没用」把技能在 active → stale → archived 之间搬动，' +
  '还能 fork 一个 AIAgent 出来做 LLM 评审。但它有三条铁律——只碰 agent 创建的技能、从不删除只归档、' +
  'pinned 全豁免。点击下面的状态节点看逻辑，再点「触发一次策展检查」看一轮真实流转。';

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
    body: '默认状态。技能正常出现在列表与斜杠命令里。每当技能被使用（use_count）、被查看（view_count）、被修改（patch_count），tools/skill_usage.py 都会刷新 last_activity_at——这个时间戳是策展器判断「活不活跃」的锚点（anchor）。',
    sources: [
      { path: 'tools/skill_usage.py', note: 'record_skill_use / view / patch 三个计数入口' },
      { path: 'agent/curator.py', note: '自动流转：anchor ≤ stale_cutoff 时 active → stale' },
    ],
  },
  {
    id: 'stale',
    name: 'stale',
    tagline: '久未使用',
    body: '锚点超过 stale_after_days（默认 30 天）没有活动，active 被标记为 stale。stale 不是惩罚：技能照常可用、照常出现在命令里，只是一个「可能被归档」的信号。若之后又被使用（anchor 新于 stale 线），下一轮检查会自动 reactivate 回 active。',
    sources: [
      { path: 'agent/curator.py', note: 'mark stale / reactivate 的 cutoff 比较' },
      { path: 'config.yaml · curator.stale_after_days', note: '默认 30 天' },
    ],
  },
  {
    id: 'archived',
    name: 'archived',
    tagline: '归档可恢复',
    body: '锚点超过 archive_after_days（默认 90 天），技能被移动到 ~/.hermes/skills/.archive/——这是策展器最重的操作，且可逆：hermes curator restore 随时能捞回来。从未使用过的技能有宽限地板：创建不满 stale_after_days 的一律不动，「没有使用证据」不等于「该归档」。',
    sources: [
      { path: 'tools/skill_usage.py', note: 'archive_skill()，.archive/ 扁平布局' },
      { path: 'config.yaml · curator.archive_after_days', note: '默认 90 天' },
    ],
  },
  {
    id: 'pinned',
    name: 'pinned',
    tagline: '豁免态（正交标记）',
    body: 'pinned 是与 state 正交的布尔标记，不是第四个状态：一个技能可以 active + pinned。pin 住的技能跳过一切自动流转、也跳过 LLM 评审；连 skill_manage(action="delete") 都拒绝删除 pinned 技能——但 patch / edit / write_file 照常放行，agent 可以继续改进它。cronjob 引用着的技能也被视作 pinned，不被自动流转。',
    sources: [
      { path: 'agent/curator.py', note: 'pinned 与 cron 引用技能的豁免分支' },
      { path: 'hermes_cli/curator.py', note: 'hermes curator pin / unpin' },
    ],
  },
];

// 遥测：~/.hermes/skills/.usage.json 每个技能的记录字段（tools/skill_usage.py）。
export const CURATOR_USAGE_FIELDS = [
  { name: 'use_count', note: '技能被实际使用的次数（record use 时 +1）' },
  { name: 'view_count', note: '被 skill_view 查看的次数' },
  { name: 'patch_count', note: '被 skill_manage patch/edit 修改的次数' },
  { name: 'last_activity_at', note: '最近活动时间戳——策展流转的锚点' },
  { name: 'state', note: 'active / stale / archived' },
  { name: 'pinned', note: '豁免标记，正交于 state' },
  { name: 'created_by', note: '"agent" 才会被策展器管理；其余一律不碰' },
];

// 铁律（AGENTS.md「Curator (skill lifecycle)」Invariants，逐字对齐）。
export const CURATOR_IRON_RULES = [
  {
    title: '只碰 created_by: "agent" 的技能',
    body: 'bundled 与 hub 安装的技能永不纳入自动策展。tools/skill_usage.py 的 is_curation_eligible() 只认 .usage.json 里 created_by == "agent" 的记录。',
  },
  {
    title: '从不删除，最重操作是归档',
    body: '归档 = 移动到 ~/.hermes/skills/.archive/，hermes curator restore 可恢复。用户永远不会丢技能。',
  },
  {
    title: 'pinned 全豁免',
    body: 'pinned 技能跳过每一次自动流转与 LLM 评审；skill_manage(action="delete") 也拒绝删除 pinned 技能。',
  },
];

// 策展检查模拟：一轮自动流转的输入样本与判定规则。
// 判定逻辑对齐 agent/curator.py 的自动状态流转（约 306–380 行）：
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
  staleAfterDays: 30, // curator.stale_after_days 默认值
  archiveAfterDays: 90, // curator.archive_after_days 默认值
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
    lastActivityDays: 45,
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
  'curator 的权力清单：标记 stale、归档到 .archive/、提请 LLM 评审。' +
  '不在清单上的事一件也做不了——删技能不行，动你的技能不行，碰 pinned 不行。';

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const SKILL_FORMAT_INTRO_EN =
  'A Hermes skill is just a Markdown file with YAML frontmatter (SKILL.md): the frontmatter tells the loader ' +
  '"who I am, which platforms I run on, what config I need", and the body tells the model "how to do it". ' +
  'Below we take apart every frontmatter field — its purpose and the validation rules it must pass before merge. ' +
  'These rules live in AGENTS.md under "Skill authoring standards (HARDLINE)", and reviewers will reject PRs that violate them.';

export const SKILL_FRONTMATTER_FIELDS_EN: SkillField[] = [
  {
    id: 'name',
    name: 'name',
    required: true,
    tagline: "The skill's unique identifier",
    purpose:
      'The skill name, and the source of the slash command: /github-auth is derived from name. ' +
      'The loader normalizes names to lowercase hyphenated slugs; when frontmatter omits name, it falls back to the directory name.',
    rules: [
      'All lowercase, hyphen-separated (the loader scrubs illegal characters into hyphens)',
      'Normalized names must not collide — two skills with the same slug register only one command',
      'The directory name should match name, for easy human lookup',
    ],
    example: 'name: github-auth',
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
    example: 'description: "GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login."',
  },
  {
    id: 'version',
    name: 'version',
    required: false,
    tagline: 'Semantic version',
    purpose:
      'The skill\'s own version, bumped as the content evolves, so you can track "which version of this skill is this".',
    rules: [
      'Semantic three-part versioning (e.g. 1.1.0)',
      'Bump on any substantive content change',
    ],
    example: 'version: 1.1.0',
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
    example: 'author: Hermes Agent',
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
    tags: [GitHub, Authentication, Git, gh-cli, SSH, Setup]`,
  },
  {
    id: 'category',
    name: 'metadata.hermes.category',
    required: false,
    tagline: 'Category',
    purpose:
      'Skill category. Bundled skills are organized into category directories (skills/github/, skills/mlops/ …); ' +
      'optional-skills/ has its own category set.',
    rules: [
      "Keep consistent with the target directory's category",
      'Heavy-dependency or niche skills belong in optional-skills/, not skills/',
    ],
    example: `metadata:
  hermes:
    category: github`,
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
    related_skills: [github-pr-workflow, github-code-review, github-issues]`,
  },
  {
    id: 'config',
    name: 'metadata.hermes.config',
    required: false,
    tagline: 'Declares required config',
    purpose:
      'config.yaml settings the skill needs: stored under skills.config.<key>, prompted for in the setup wizard, ' +
      'and injected when the skill loads. agent/skill_preprocessing.py expands these config variables.',
    rules: [
      'Only declare config keys the skill genuinely depends on',
      'Secret values still go in ~/.hermes/.env, never in config',
    ],
    example: `metadata:
  hermes:
    config:
      jira_base_url: "https://example.atlassian.net"`,
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
    body: 'scan_skill_commands() in agent/skill_commands.py scans ~/.hermes/skills/ (SKILLS_DIR = HERMES_HOME / "skills", defined in tools/skills_tool.py), plus any extra directories configured via skills.external_dirs in config.yaml. The repo\'s bundled skills/ are organized into category subdirectories; skills in optional-skills/ only appear after explicit installation via hermes skills install.',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'scan_skill_commands()',
      snippet: `def scan_skill_commands() -> Dict[str, Dict[str, Any]]:
    """Scan ~/.hermes/skills/ and return a mapping of /command -> skill info."""
    from tools.skills_tool import (
        SKILLS_DIR, _parse_frontmatter,
        skill_matches_platform, skill_matches_environment,
        _get_disabled_skill_names,
    )
    for skill_md in skills_dir.rglob("SKILL.md"):
        ...`,
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
      file: 'tools/skills_tool.py',
      lines: '_parse_frontmatter()',
      snippet: `frontmatter, body = _parse_frontmatter(content)
name = frontmatter.get('name', skill_md.parent.name)
description = frontmatter.get('description', '')`,
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
    body: 'skill_matches_platform() (agent/skill_utils.py) compares the frontmatter platforms list against sys.platform; skill_matches_environment() then checks whether the env vars the skill declares are present. Only skills passing both gates enter the command table — a Mac user never sees a Linux-only skill command.',
    code: {
      file: 'agent/skill_utils.py',
      lines: 'skill_matches_platform_list()',
      snippet: `def skill_matches_platform_list(platforms: Any) -> bool:
    if not platforms:
        return True
    current = sys.platform
    for platform in platforms:
        normalized = str(platform).lower().strip()
        ...`,
      note: 'platforms omitted = available on all platforms',
    },
    points: [
      'A subset of platforms: [linux, macos, windows]',
      'Environment gating: missing required env vars → not shown',
      'Gating happens at scan time, not as a call-time error',
    ],
  },
  {
    id: 'inject',
    label: 'Inject',
    title: 'Injected as a user message (cache-friendly)',
    body: 'When the user types /github-auth, _build_skill_message() wraps the SKILL.md body with scaffolding into a user message entering the conversation — the system prompt is never rewritten. AGENTS.md states it upfront: per-conversation prompt caching is sacred; anything that rewrites past context mid-conversation busts the cache and doubles the cost.',
    code: {
      file: 'agent/skill_commands.py',
      lines: 'AGENTS.md §CLI Architecture',
      snippet: `# Skill slash commands: agent/skill_commands.py scans
# ~/.hermes/skills/, injects as **user message**
# (not system prompt) to preserve prompt caching
_SKILL_INVOCATION_PREFIX = "[IMPORTANT: The user has invoked the "
_SINGLE_SKILL_MARKER = "The full skill content is loaded below.]"`,
      note: "The scaffolding markers are byte-stable — the memory provider relies on them to recover the user's real instruction",
    },
    points: [
      'Injected as a user message: the cache prefix is untouched, cost stays flat',
      "The scaffolding markers let the memory system strip the skill body and store only the user's instruction",
      'Skill changes take effect "next session" by default; --now busts the cache immediately',
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
      snippet: `def get_skill_commands() -> Dict[str, Dict[str, Any]]:
    """Rescans ~/.hermes/skills/ and any skills.external_dirs ..."""
    # description 取自 SKILL.md frontmatter，供 /help 与补全展示`,
      note: 'The command name is the normalized slug of name (lowercase, hyphenated)',
    },
    points: [
      'One scan result, reused across CLI / gateway / TUI / desktop',
      'Skill commands live in the same table as built-in commands, so completion picks them up automatically',
      'Adding a skill = dropping a directory into skills/ — no code changes needed',
    ],
  },
];

export const CURATOR_INTRO_EN =
  'The agent keeps writing more and more skills — who cleans up? The curator is a background maintenance system: ' +
  'it reads each skill\'s .usage.json telemetry and moves skills between active → stale → archived based on "how long since last use", ' +
  'and it can even fork an AIAgent to run LLM reviews. But it has three iron rules — it only touches agent-created skills, ' +
  'it never deletes (archiving is the limit), and pinned skills are fully exempt. ' +
  'Click the state nodes below to see the logic, then hit "Run a curation check" to watch a real pass.';

export const CURATOR_STATES_EN: CuratorStateNode[] = [
  {
    id: 'active',
    name: 'active',
    tagline: 'In service',
    body: 'The default state. The skill appears normally in the list and slash commands. Whenever the skill is used (use_count), viewed (view_count), or modified (patch_count), tools/skill_usage.py refreshes last_activity_at — the timestamp that anchors the curator\'s "is it alive" judgment.',
    sources: [
      {
        path: 'tools/skill_usage.py',
        note: 'record_skill_use / view / patch — the three counting entry points',
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
    body: 'When the anchor sits past stale_after_days (default 30 days) without activity, an active skill is marked stale. stale is not a punishment: the skill stays usable and keeps its command — it is just a "may be archived" signal. If it gets used again (anchor newer than the stale line), the next check automatically reactivates it to active.',
    sources: [
      { path: 'agent/curator.py', note: 'The cutoff comparisons for mark stale / reactivate' },
      { path: 'config.yaml · curator.stale_after_days', note: 'Default: 30 days' },
    ],
  },
  {
    id: 'archived',
    name: 'archived',
    tagline: 'Archived, restorable',
    body: 'When the anchor exceeds archive_after_days (default 90 days), the skill is moved to ~/.hermes/skills/.archive/ — the curator\'s heaviest operation, and it is reversible: hermes curator restore can always bring it back. Never-used skills have a grace floor: anything younger than stale_after_days is left alone — "no evidence of use" does not mean "should be archived".',
    sources: [
      { path: 'tools/skill_usage.py', note: 'archive_skill(), with the flat .archive/ layout' },
      { path: 'config.yaml · curator.archive_after_days', note: 'Default: 90 days' },
    ],
  },
  {
    id: 'pinned',
    name: 'pinned',
    tagline: 'Exempt (orthogonal flag)',
    body: 'pinned is a boolean flag orthogonal to state, not a fourth state: a skill can be active + pinned. Pinned skills skip all automatic transitions and the LLM review; even skill_manage(action="delete") refuses to delete a pinned skill — but patch / edit / write_file still work, so the agent can keep improving it. Skills referenced by cronjobs are also treated as pinned and never auto-transitioned.',
    sources: [
      {
        path: 'agent/curator.py',
        note: 'Exemption branches for pinned and cron-referenced skills',
      },
      { path: 'hermes_cli/curator.py', note: 'hermes curator pin / unpin' },
    ],
  },
];

export const CURATOR_USAGE_FIELDS_EN: typeof CURATOR_USAGE_FIELDS = [
  { name: 'use_count', note: 'Times the skill was actually used (+1 on record use)' },
  { name: 'view_count', note: 'Times it was viewed via skill_view' },
  { name: 'patch_count', note: 'Times it was modified via skill_manage patch/edit' },
  {
    name: 'last_activity_at',
    note: 'Last activity timestamp — the anchor for curation transitions',
  },
  { name: 'state', note: 'active / stale / archived' },
  { name: 'pinned', note: 'Exemption flag, orthogonal to state' },
  {
    name: 'created_by',
    note: 'Only "agent" skills are managed by the curator; everything else is untouched',
  },
];

export const CURATOR_IRON_RULES_EN: typeof CURATOR_IRON_RULES = [
  {
    title: 'Only touches created_by: "agent" skills',
    body: 'Bundled and hub-installed skills are never auto-curated. is_curation_eligible() in tools/skill_usage.py only accepts records with created_by == "agent" in .usage.json.',
  },
  {
    title: 'Never deletes — archiving is the heaviest operation',
    body: 'Archiving = moving to ~/.hermes/skills/.archive/, restorable via hermes curator restore. Users never lose a skill.',
  },
  {
    title: 'pinned is fully exempt',
    body: 'Pinned skills skip every automatic transition and LLM review; skill_manage(action="delete") also refuses to delete them.',
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
    lastActivityDays: 45,
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
  "The curator's power list: mark stale, archive to .archive/, request an LLM review. " +
  'Anything not on the list is off-limits — no deleting skills, no touching your skills, no touching pinned.';

// SkillFormatLab 专属 UI 文案。
export const SKILL_FORMAT_UI = {
  frontmatterTitle: { zh: '逐个字段拆开看', en: 'Every field, taken apart' },
  required: { zh: '必填', en: 'required' },
  optional: { zh: '可选', en: 'optional' },
  rulesHeading: { zh: '校验规则', en: 'Validation rules' },
  exampleNote: { zh: '示例摘自真实技能文件', en: 'Example from a real skill file' },
  realFrontmatterHeading: {
    zh: '一份真实的 frontmatter（skills/github/github-auth/SKILL.md）',
    en: 'A real frontmatter (skills/github/github-auth/SKILL.md)',
  },
  bodySpecHeading: {
    zh: '正文规范：现代章节顺序（HARDLINE 第 5 条）',
    en: 'Body spec: modern section order (HARDLINE rule 5)',
  },
  bodySpecNote: {
    zh: '复杂技能目标 ~200 行，简单技能 ~100 行；脚本进 scripts/、参考进 references/、模板进 templates/。',
    en: 'Target ~200 lines for complex skills, ~100 for simple ones; scripts go in scripts/, references in references/, templates in templates/.',
  },
  loadKicker: { zh: '加载流程', en: 'Loading pipeline' },
  loadTitle: { zh: '从磁盘到斜杠命令：五步', en: 'From disk to slash command: five steps' },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住技能格式', en: 'The skill format in one sentence' },
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
    zh: 'state 取值 active / stale / archived；created_by == "agent" 才会被策展',
    en: 'state is active / stale / archived; only created_by == "agent" gets curated',
  },
  simKicker: { zh: '模拟', en: 'Simulation' },
  simTitle: { zh: '触发一次策展检查', en: 'Run a curation check' },
  simDesc: {
    zh: (count: number, stale: number, archive: number, days: number) =>
      `按下按钮，对下面 ${count} 个样本技能跑一轮自动流转判定（规则与 agent/curator.py 一致；配置取默认值：stale_after_days=${stale}、archive_after_days=${archive}、每 ${days} 天一轮）。`,
    en: (count: number, stale: number, archive: number, days: number) =>
      `Press the button to run one automatic transition pass over the ${count} sample skills below (rules match agent/curator.py; defaults: stale_after_days=${stale}, archive_after_days=${archive}, one pass every ${days} days).`,
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
  rulesTitle: { zh: 'curator 永远不做这三件事', en: 'Three things the curator never does' },
  ruleLabel: {
    zh: (i: number) => `铁律 ${i}`,
    en: (i: number) => `Rule ${i}`,
  },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住策展器', en: 'The curator in one sentence' },
  reasonNotAgent: {
    zh: 'created_by ≠ "agent"——bundled / 用户技能策展器无权触碰',
    en: 'created_by ≠ "agent" — bundled / user skills are off-limits to the curator',
  },
  reasonPinned: {
    zh: 'pinned——跳过一切自动流转与 LLM 评审',
    en: 'pinned — skips all automatic transitions and the LLM review',
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
