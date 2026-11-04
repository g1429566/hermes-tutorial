import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LessonProse from '@/components/LessonProse';

describe('lesson prose rendering', () => {
  it('renders Markdown tables and code while keeping feedback closed initially', () => {
    const source =
      '| State | Value |\n| --- | --- |\n| Disk | Saved |\n\n```text\n<tool_call>\n```\n\n<details>\n<summary>Check your answer</summary>\n\nThe snapshot stays fixed.\n\n</details>';
    const html = renderToStaticMarkup(
      createElement(LessonProse, { lesson: { zh: source, en: source }, lang: 'en' }),
    );
    expect(html).toContain('<table>');
    expect(html).toContain('&lt;tool_call&gt;');
    expect(html).toContain('<summary>Check your answer</summary>');
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
  });

  it('uses the chosen language and never executes raw lesson HTML', () => {
    const html = renderToStaticMarkup(
      createElement(LessonProse, {
        lesson: { zh: '中文讲解', en: 'English explanation\n\n<script>alert(1)</script>' },
        lang: 'en',
      }),
    );
    expect(html).toContain('English explanation');
    expect(html).not.toContain('中文讲解');
    expect(html).not.toContain('<script>');
  });
});
