'use client';

import CourseNav from '@/components/CourseNav';
import ChapterRenderer from '@/components/ChapterRenderer';
import { useChapter } from '@/hooks/useChapter';
import { LangProvider } from '@/lib/i18n';
import type { CourseLessons } from '@/data/lesson-types';

export default function Course({ lessons }: { lessons: CourseLessons }) {
  const { chapter, navigate } = useChapter();
  return (
    <LangProvider>
      <div className="min-h-screen">
        <CourseNav currentId={chapter.id} onNavigate={navigate} />
        <main className="lg:ml-[268px]">
          <ChapterRenderer chapterId={chapter.id} onNavigate={navigate} lessons={lessons} />
        </main>
      </div>
    </LangProvider>
  );
}
