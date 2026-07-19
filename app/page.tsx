'use client';

import CourseNav from '@/components/CourseNav';
import ChapterRenderer from '@/components/ChapterRenderer';
import { useChapter } from '@/hooks/useChapter';

// 单页沉浸式应用：左侧固定导航 + 右侧章节内容，hash 路由（#/chapter-id）。
export default function Page() {
  const { chapter, navigate } = useChapter();

  return (
    <div className="min-h-screen">
      <CourseNav currentId={chapter.id} onNavigate={navigate} />
      <main className="lg:ml-[268px]">
        <ChapterRenderer chapterId={chapter.id} onNavigate={navigate} />
      </main>
    </div>
  );
}
