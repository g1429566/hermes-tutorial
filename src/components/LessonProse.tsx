import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Lesson } from '@/data/lesson-types';
import type { Lang } from '@/lib/i18n';

interface LessonProseProps {
  lesson: Lesson;
  lang: Lang;
}

function Prose({ children }: { children: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} skipHtml>
      {children}
    </Markdown>
  );
}

export default function LessonProse({ lesson, lang }: LessonProseProps) {
  const source = lesson[lang];
  const sections = [];
  let cursor = 0;
  // Only this explicit authoring construct becomes HTML; raw Markdown HTML stays disabled.
  for (const match of source.matchAll(
    /<details>\s*<summary>([^<]+)<\/summary>([\s\S]*?)<\/details>/g,
  )) {
    sections.push(<Prose key={`text-${cursor}`}>{source.slice(cursor, match.index)}</Prose>);
    sections.push(
      <details key={`answer-${match.index}`} className="lesson-answer">
        <summary>{match[1]}</summary>
        <Prose>{match[2]}</Prose>
      </details>,
    );
    cursor = match.index + match[0].length;
  }
  sections.push(<Prose key={`text-${cursor}`}>{source.slice(cursor)}</Prose>);
  return <div className="lesson-prose mt-8 max-w-3xl">{sections}</div>;
}
