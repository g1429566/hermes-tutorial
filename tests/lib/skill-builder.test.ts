import { format } from 'prettier';
import { expect, it } from 'vitest';
import { buildSkillMarkdown, DEFAULT_SKILL_FORM } from '@/data/skill-builder';

it('produces parseable frontmatter that preserves quoted, multiline field text', async () => {
  const description = 'Read "total" from C:\\data\nfor this report.';
  const author = 'Lee: "Editor"';
  const source = buildSkillMarkdown({ ...DEFAULT_SKILL_FORM, description, author });
  const yaml = source.split('\n').slice(1, -1).join('\n');
  await expect(format(yaml, { parser: 'yaml' })).resolves.toBeTruthy();
  for (const [field, expectedValue] of Object.entries({ description, author })) {
    const literal = yaml
      .split('\n')
      .find((line) => line.startsWith(field + ': '))!
      .slice(field.length + 2);
    expect(JSON.parse(literal)).toBe(expectedValue);
  }
});
