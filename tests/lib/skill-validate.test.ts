import { describe, expect, it } from 'vitest';
import { SKILL_PLATFORMS, validateSkill, type SkillFields } from '../../src/lib/skill-validate';

// 合法基线：满足 AGENTS.md 技能创作硬标准的全部字段规则。
const VALID: SkillFields = {
  name: 'arxiv-digest',
  description: 'Fetch and summarize new arXiv papers by topic.',
  version: '1.0.0',
  platforms: ['macos', 'linux'],
};

function fields(overrides: Partial<SkillFields> = {}): SkillFields {
  return { ...VALID, ...overrides };
}

describe('validateSkill', () => {
  it('passes a fully valid skill', () => {
    expect(validateSkill(VALID)).toEqual([]);
  });

  it('accepts a Chinese description ending with 。', () => {
    expect(validateSkill(fields({ description: '按主题抓取并总结最新的 arXiv 论文。' }))).toEqual(
      [],
    );
  });

  it('accepts an empty platforms list and the full macos/linux/windows set', () => {
    expect(validateSkill(fields({ platforms: [] }))).toEqual([]);
    expect(validateSkill(fields({ platforms: [...SKILL_PLATFORMS] }))).toEqual([]);
  });

  it('exposes exactly macos/linux/windows as valid platforms', () => {
    expect(SKILL_PLATFORMS).toEqual(['macos', 'linux', 'windows']);
  });

  it('requires name', () => {
    const errors = validateSkill(fields({ name: '   ' }));
    expect(errors.some((e) => e.field === 'name' && e.message.includes('必填'))).toBe(true);
  });

  it('rejects non-kebab-case names', () => {
    for (const name of [
      'ArxivDigest',
      'arxiv_digest',
      'arxiv digest',
      '-arxiv',
      'arxiv-',
      'a--b',
    ]) {
      const errors = validateSkill(fields({ name }));
      expect(errors.some((e) => e.field === 'name')).toBe(true);
    }
  });

  it('requires description', () => {
    const errors = validateSkill(fields({ description: '' }));
    expect(errors.some((e) => e.field === 'description' && e.message.includes('必填'))).toBe(true);
  });

  it('rejects descriptions longer than 60 characters', () => {
    const long = 'Fetch and summarize the newest arXiv papers by topic area daily.';
    expect(long.length).toBeGreaterThan(60);
    const errors = validateSkill(fields({ description: long }));
    expect(errors.some((e) => e.field === 'description' && e.message.includes('60'))).toBe(true);
  });

  it('rejects descriptions without a trailing period', () => {
    const errors = validateSkill(fields({ description: 'Fetch arXiv papers' }));
    expect(errors.some((e) => e.field === 'description' && e.message.includes('句号'))).toBe(true);
  });

  it('rejects multi-sentence descriptions', () => {
    const errors = validateSkill(
      fields({ description: 'Fetch arXiv papers. Then summarize them.' }),
    );
    expect(errors.some((e) => e.field === 'description' && e.message.includes('一句话'))).toBe(
      true,
    );
  });

  it('rejects marketing words, English and Chinese alike', () => {
    for (const description of [
      'A powerful arXiv fetcher.',
      'Comprehensive paper summaries.',
      'Seamless arXiv integration.',
      'An advanced digest tool.',
      '强大的论文抓取工具。',
      '全面覆盖 arXiv 论文。',
      '无缝接入论文数据源。',
      '先进的论文摘要工具。',
    ]) {
      const errors = validateSkill(fields({ description }));
      expect(errors.some((e) => e.field === 'description' && e.message.includes('营销词'))).toBe(
        true,
      );
    }
  });

  it('rejects descriptions repeating the skill name', () => {
    // 连字符形式的原名
    expect(
      validateSkill(fields({ description: 'Run arxiv-digest over a feed.' })).some(
        (e) => e.field === 'description' && e.message.includes('技能名'),
      ),
    ).toBe(true);
    // 空格展开形式（arxiv-digest → arxiv digest）
    expect(
      validateSkill(fields({ description: 'An arxiv digest for your feed.' })).some(
        (e) => e.field === 'description' && e.message.includes('技能名'),
      ),
    ).toBe(true);
  });

  it('requires version and rejects non x.y.z shapes', () => {
    expect(
      validateSkill(fields({ version: '' })).some(
        (e) => e.field === 'version' && e.message.includes('必填'),
      ),
    ).toBe(true);
    for (const version of ['1.0', 'v1.0.0', '1.0.0.0', 'latest', '1.0.x']) {
      const errors = validateSkill(fields({ version }));
      expect(errors.some((e) => e.field === 'version')).toBe(true);
    }
  });

  it('rejects platforms outside macos/linux/windows', () => {
    const errors = validateSkill(fields({ platforms: ['macos', 'darwin', 'freebsd'] }));
    expect(errors.some((e) => e.field === 'platforms')).toBe(true);
  });

  it('collects every broken field at once', () => {
    const errors = validateSkill({
      name: 'Bad Name',
      description: '',
      version: '1',
      platforms: ['darwin'],
    });
    expect(errors.map((e) => e.field).sort()).toEqual([
      'description',
      'name',
      'platforms',
      'version',
    ]);
  });
});
