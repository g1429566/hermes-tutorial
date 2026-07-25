// Chapter 18「写一个新技能」数据源：技能构建器。
// 字段与硬标准对齐 hermes-agent/AGENTS.md「SKILL.md frontmatter」（870–880 行）
// 与「Skill authoring standards (HARDLINE)」（882–955 行）；
// frontmatter 形状对齐真实技能 skills/apple/apple-reminders/SKILL.md。

import { SKILL_PLATFORMS } from '@/lib/skill-validate';

export interface SkillBuilderForm {
  name: string;
  description: string;
  version: string;
  author: string;
  platforms: string[];
  category: string;
}

export const SKILL_BUILDER_INTRO =
  '技能是 Hermes 沉淀领域 know-how 的方式：一个 SKILL.md，加上按需加载的脚本与参考资料。' +
  '写一个技能最容易翻车的地方不是正文，而是 frontmatter——AGENTS.md 为它立了 8 条硬标准，' +
  'reviewer 会直接拒掉违反的 PR。下面这个构建器把最硬的字段规则做成了实时校验：' +
  '左边填表，右边立刻看到生成的 SKILL.md frontmatter 和校验结果。';

// 可选分类：AGENTS.md 862–864 行列出的 optional-skills 类目
export const SKILL_CATEGORIES = [
  'autonomous-ai-agents',
  'blockchain',
  'communication',
  'creative',
  'devops',
  'email',
  'health',
  'mcp',
  'migration',
  'mlops',
  'productivity',
  'research',
  'security',
  'web-development',
];

// platforms 白名单与校验器共享同一份定义
export const PLATFORMS = SKILL_PLATFORMS;

export const DEFAULT_SKILL_FORM: SkillBuilderForm = {
  name: 'arxiv-digest',
  description: 'Fetch and summarize new arXiv papers by topic.',
  version: '0.1.0',
  author: 'Your Name <@your-github>',
  platforms: ['macos', 'linux'],
  category: 'research',
};

// 目录结构约定：硬标准第 6 条（scripts/references/templates 各就各位）
export const SKILL_DIR_ENTRIES = [
  { file: 'SKILL.md', desc: '技能入口：frontmatter + 正文，模型唯一必读的文件' },
  { file: 'scripts/', desc: '辅助脚本——别让模型每次调用都现场手写解析器' },
  { file: 'references/', desc: '参考文档，按需加载，不占默认上下文' },
  { file: 'templates/', desc: '模板文件，由脚本或正文引用' },
];

// 现代章节顺序：硬标准第 5 条
export const SKILL_SECTION_ORDER = [
  { name: '# <Skill> Skill', desc: '标题 + 2–3 句引言：做什么、不做什么' },
  { name: '## When to Use', desc: '触发场景——模型靠它判断要不要加载这个技能' },
  { name: '## Prerequisites', desc: '环境变量、命令、权限等前置条件' },
  { name: '## How to Run', desc: '运行入口与基本用法' },
  { name: '## Quick Reference', desc: '命令/参数速查表' },
  { name: '## Procedure', desc: '分步流程' },
  { name: '## Pitfalls', desc: '常见坑与平台差异' },
  { name: '## Verification', desc: '如何验证技能真的生效了' },
];

// 生成 SKILL.md 的 YAML frontmatter（形状对齐 apple-reminders 等真实技能）
export function buildSkillMarkdown(form: SkillBuilderForm): string {
  const name = form.name.trim() || 'my-skill';
  const description = form.description.trim() || 'Describe what the skill does.';
  const version = form.version.trim() || '0.1.0';
  const author = form.author.trim() || 'Your Name';
  const platforms = form.platforms.length > 0 ? `[${form.platforms.join(', ')}]` : '[]';
  return [
    '---',
    `name: ${name}`,
    `description: "${description}"`,
    `version: ${version}`,
    `author: ${author}`,
    'license: MIT',
    `platforms: ${platforms}`,
    'metadata:',
    '  hermes:',
    `    category: ${form.category}`,
    '---',
  ].join('\n');
}

export function skillFilePath(form: SkillBuilderForm): string {
  return `skills/${form.category}/${form.name.trim() || 'my-skill'}/SKILL.md`;
}

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const SKILL_BUILDER_INTRO_EN =
  'Skills are how Hermes accumulates domain know-how: a SKILL.md plus scripts and references ' +
  'loaded on demand. The easiest place to get a skill wrong is not the body but the frontmatter — ' +
  'AGENTS.md sets 8 hardline rules for it, and reviewers reject violating PRs on sight. ' +
  'The builder below turns the hardest field rules into live validation: fill in the form on the left, ' +
  'and instantly see the generated SKILL.md frontmatter and validation results on the right.';

export const SKILL_DIR_ENTRIES_EN: typeof SKILL_DIR_ENTRIES = [
  {
    file: 'SKILL.md',
    desc: 'Skill entry point: frontmatter + body, the only file the model must read',
  },
  {
    file: 'scripts/',
    desc: "Helper scripts — don't make the model hand-write a parser on every call",
  },
  {
    file: 'references/',
    desc: 'Reference docs, loaded on demand, kept out of the default context',
  },
  { file: 'templates/', desc: 'Template files, referenced by scripts or the body' },
];

export const SKILL_SECTION_ORDER_EN: typeof SKILL_SECTION_ORDER = [
  {
    name: '# <Skill> Skill',
    desc: 'Title + 2–3 sentence intro: what it does, what it does not do',
  },
  {
    name: '## When to Use',
    desc: 'Trigger scenarios — the model uses this to decide whether to load the skill',
  },
  { name: '## Prerequisites', desc: 'Env vars, commands, permissions, and other preconditions' },
  { name: '## How to Run', desc: 'Entry point and basic usage' },
  { name: '## Quick Reference', desc: 'Command/parameter cheat sheet' },
  { name: '## Procedure', desc: 'Step-by-step flow' },
  { name: '## Pitfalls', desc: 'Common traps and platform differences' },
  { name: '## Verification', desc: 'How to verify the skill actually works' },
];

// 本章专属 UI 文案（表单标签、说明段、记忆钩子等）
export const SKILL_BUILDER_UI = {
  descLabel: {
    zh: `description · 一句话，≤{MAX} 字符，句号结尾`,
    en: `description · one sentence, ≤{MAX} chars, ends with a period`,
  },
  authorLabel: {
    zh: 'author · 人类贡献者在前（硬标准第 4 条）',
    en: 'author · human contributors first (hardline rule #4)',
  },
  platformsLabel: {
    zh: 'platforms · OS 门控（硬标准第 3 条）',
    en: 'platforms · OS gating (hardline rule #3)',
  },
  platformsNote: {
    zh: '全不选 = 不声明门控；脚本里用了 fcntl / osascript / systemctl 这类平台绑定原语时才收窄。',
    en: 'Selecting none = no gating declared; only narrow it when scripts use platform-bound primitives like fcntl / osascript / systemctl.',
  },
  previewNote: {
    zh: '实时生成的 YAML frontmatter——与仓库里真实技能同一形状',
    en: 'Live-generated YAML frontmatter — same shape as real skills in the repo',
  },
  validationTitle: {
    zh: '硬标准校验（AGENTS.md 第 1、3 条）',
    en: 'Hardline validation (AGENTS.md rules #1, #3)',
  },
  validationPass: {
    zh: '✓ 全部通过——这个 frontmatter 过了 reviewer 的第一关',
    en: "✓ All checks pass — this frontmatter clears the reviewer's first gate",
  },
  dirKicker: { zh: '目录约定', en: 'Directory conventions' },
  dirTitle: { zh: '一个技能就是一个目录', en: 'A skill is a directory' },
  dirBody: {
    zh: '硬标准第 6 条：脚本进 scripts/、参考进 references/、模板进 templates/——别指望模型每次调用都现场重写解析逻辑，把帮手随技能一起发布，正文里用相对路径引用。',
    en: "Hardline rule #6: scripts go in scripts/, references in references/, templates in templates/ — don't expect the model to rewrite parsing logic on every call; ship the helpers with the skill and reference them by relative path in the body.",
  },
  sectionsKicker: { zh: '正文结构', en: 'Body structure' },
  sectionsTitle: {
    zh: '现代章节顺序（硬标准第 5 条）',
    en: 'Modern section order (hardline rule #5)',
  },
  sectionsBody: {
    zh: '复杂技能目标约 200 行、简单技能约 100 行；砍掉营销式引言和在 Prerequisites 里已经讲过的环境变量复读。',
    en: 'Target ~200 lines for complex skills, ~100 for simple ones; cut marketing-style intros and env-var repetition already covered in Prerequisites.',
  },
  hookKicker: { zh: '记忆钩子', en: 'Memory hook' },
  hookTitle: { zh: '一句话记住技能 frontmatter', en: 'Skill frontmatter in one sentence' },
  hookBody: {
    zh: '60 字符、一句话、句号结尾、没有营销词、不重复技能名——description 是技能的脸，也是模型注意力的税。',
    en: "60 chars, one sentence, ends with a period, no marketing words, doesn't repeat the skill name — the description is the skill's face and a tax on the model's attention.",
  },
};
