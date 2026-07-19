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
