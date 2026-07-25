import { describe, expect, it } from 'vitest';
import { pick } from '@/lib/i18n';
import { UI_STRINGS } from '@/data/ui-strings';
import { CHAPTERS, CHAPTERS_EN, MODULES, MODULE_ORDER, MODULES_EN, chapterText } from '@/data/chapters';

describe('ui-strings 词典', () => {
  it('每条文案都有 zh 和 en', () => {
    for (const [id, pair] of Object.entries(UI_STRINGS)) {
      expect(pair.zh, `${id}.zh`).toBeTruthy();
      expect(pair.en, `${id}.en`).toBeTruthy();
    }
  });
});

describe('章节英文元数据', () => {
  it('每章都有英文文案，且字段齐全', () => {
    for (const c of CHAPTERS) {
      const en = CHAPTERS_EN[c.id];
      expect(en, `CHAPTERS_EN[${c.id}]`).toBeDefined();
      expect(en.title).toBeTruthy();
      expect(en.kicker).toBeTruthy();
      expect(en.description).toBeTruthy();
      expect(en.meta).toBeTruthy();
    }
  });

  it('每个模块都有英文名', () => {
    for (const mid of MODULE_ORDER) {
      expect(MODULES_EN[mid]).toBeTruthy();
      expect(MODULES[mid].title).toBeTruthy();
    }
  });

  it('chapterText 按语言返回对应文案', () => {
    const c = CHAPTERS[0];
    expect(chapterText(c, 'zh').title).toBe(c.title);
    expect(chapterText(c, 'en').title).toBe(CHAPTERS_EN[c.id].title);
  });
});

describe('pick', () => {
  it('按语言从 { zh, en } 对中取值', () => {
    const pair = { zh: '中文', en: 'English' };
    expect(pick('zh', pair)).toBe('中文');
    expect(pick('en', pair)).toBe('English');
  });
});
