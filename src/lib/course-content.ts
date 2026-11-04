import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHAPTERS } from '@/data/chapters';
import type { CourseLessons } from '@/data/lesson-types';
import type { Lang } from '@/lib/i18n';

function readContent(lang: Lang, name: string): string {
  return readFileSync(join(process.cwd(), 'content', lang, `${name}.md`), 'utf8');
}

function splitCourse(source: string): Map<string, string> {
  const parts = source.split(/^## ([a-z][a-z0-9-]*) .+\r?\n/gm);
  return new Map(
    Array.from({ length: (parts.length - 1) / 2 }, (_, i) => [
      parts[i * 2 + 1],
      parts[i * 2 + 2].trim(),
    ]),
  );
}

// Read at static-build time: the browser receives prose, never filesystem access.
export function loadCourseLessons(): CourseLessons {
  const zh = splitCourse(readContent('zh', 'course'));
  const en = splitCourse(readContent('en', 'course'));
  for (const lang of ['zh', 'en'] as const) {
    const course = lang === 'zh' ? zh : en;
    for (const id of ['memory', 'evolution']) course.set(id, readContent(lang, id));
  }
  return Object.fromEntries(
    CHAPTERS.map(({ id }) => {
      const chinese = zh.get(id);
      const english = en.get(id);
      if (!chinese || !english) throw new Error(`Missing bilingual lesson: ${id}`);
      return [id, { zh: chinese, en: english }];
    }),
  );
}
