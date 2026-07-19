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
