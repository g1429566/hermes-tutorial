// 技能字段校验（纯函数，不进浏览器 API，可在 Vitest 直接跑）。
// 规则来自 hermes-agent/AGENTS.md「Skill authoring standards (HARDLINE)」：
// description ≤60 字符、一句话、以句号结尾、无营销词、不重复技能名（第 1 条）；
// platforms 对照真实脚本依赖声明 OS 门控（第 3 条）。
// name 用 kebab-case、version 用 x.y.z——仓库里所有真实 SKILL.md 的一致惯例。

import type { Lang } from '@/lib/i18n';

export interface SkillFields {
  name: string;
  description: string;
  version: string;
  platforms: string[];
}

export interface SkillValidationError {
  field: 'name' | 'description' | 'version' | 'platforms';
  message: string;
}

// OS 门控白名单（AGENTS.md「SKILL.md frontmatter」：platforms 是 OS-gating list）
export const SKILL_PLATFORMS = ['macos', 'linux', 'windows'] as const;

export const DESCRIPTION_MAX_LENGTH = 60;

const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VERSION_RE = /^\d+\.\d+\.\d+$/;
const TRAILING_PERIOD_RE = /[.。]$/;
const SENTENCE_END_RE = /[.。!！?？]/g;

// AGENTS.md 点名的营销词，及其中文对应
const MARKETING_WORDS = [
  'powerful',
  'comprehensive',
  'seamless',
  'advanced',
  '强大',
  '全面',
  '无缝',
  '先进',
];

// 返回错误列表；空数组 = 全部通过。lang 默认 'zh'，英文模式传 'en'。
export function validateSkill(fields: SkillFields, lang: Lang = 'zh'): SkillValidationError[] {
  const errors: SkillValidationError[] = [];
  const name = fields.name.trim();
  const description = fields.description.trim();
  const version = fields.version.trim();

  if (!name) {
    errors.push({ field: 'name', message: lang === 'en' ? 'name is required.' : 'name 必填。' });
  } else if (!KEBAB_CASE_RE.test(name)) {
    errors.push({
      field: 'name',
      message:
        lang === 'en'
          ? 'name must be kebab-case: lowercase letters, digits, single hyphens, e.g. arxiv-digest.'
          : 'name 必须是 kebab-case：小写字母、数字、单个连字符，如 arxiv-digest。',
    });
  }

  if (!description) {
    errors.push({
      field: 'description',
      message: lang === 'en' ? 'description is required.' : 'description 必填。',
    });
  } else {
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      errors.push({
        field: 'description',
        message:
          lang === 'en'
            ? `description must be ≤ ${DESCRIPTION_MAX_LENGTH} characters (currently ${description.length}) — long descriptions blow up the skill list and dilute model attention.`
            : `description 不能超过 ${DESCRIPTION_MAX_LENGTH} 字符（当前 ${description.length}）——长描述会撑爆技能列表、稀释模型注意力。`,
      });
    }
    if (!TRAILING_PERIOD_RE.test(description)) {
      errors.push({
        field: 'description',
        message:
          lang === 'en'
            ? 'description must end with a period (. or 。).'
            : 'description 必须以句号结尾（. 或 。）。',
      });
    }
    const sentenceEnds = description.match(SENTENCE_END_RE) ?? [];
    if (sentenceEnds.length > 1) {
      errors.push({
        field: 'description',
        message:
          lang === 'en'
            ? 'description must be a single sentence: state the capability, skip implementation details.'
            : 'description 只能是一句话：陈述能力，不写实现细节。',
      });
    }
    const lower = description.toLowerCase();
    const marketing = MARKETING_WORDS.find((w) => lower.includes(w.toLowerCase()));
    if (marketing) {
      errors.push({
        field: 'description',
        message:
          lang === 'en'
            ? `description contains the marketing word "${marketing}" — state the capability, no advertising.`
            : `description 含营销词「${marketing}」——陈述能力，不做广告。`,
      });
    }
    if (name) {
      const plainName = name.toLowerCase().replace(/-/g, ' ');
      if (lower.includes(name.toLowerCase()) || lower.includes(plainName)) {
        errors.push({
          field: 'description',
          message:
            lang === 'en'
              ? "description should not repeat the skill's own name."
              : 'description 不要重复技能名本身。',
        });
      }
    }
  }

  if (!version) {
    errors.push({
      field: 'version',
      message: lang === 'en' ? 'version is required.' : 'version 必填。',
    });
  } else if (!VERSION_RE.test(version)) {
    errors.push({
      field: 'version',
      message:
        lang === 'en'
          ? 'version must look like x.y.z (e.g. 1.0.0).'
          : 'version 必须形如 x.y.z（如 1.0.0）。',
    });
  }

  const invalid = fields.platforms.filter(
    (p) => !(SKILL_PLATFORMS as readonly string[]).includes(p),
  );
  if (invalid.length > 0) {
    errors.push({
      field: 'platforms',
      message:
        lang === 'en'
          ? `platforms must be a subset of ${SKILL_PLATFORMS.join(' / ')} (got: ${invalid.join(', ')}).`
          : `platforms 只能是 ${SKILL_PLATFORMS.join(' / ')} 的子集（收到：${invalid.join('、')}）。`,
    });
  }

  return errors;
}
