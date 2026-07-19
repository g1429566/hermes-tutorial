'use client';

import { useCallback, useEffect, useState } from 'react';
import { CHAPTER_BY_ID, CHAPTERS, type Chapter } from '@/data/chapters';
import { getSnapshot, markChapterReading, setLastPosition } from '@/lib/progress-v2';

function readHash(): string | null {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.replace(/^#\/?/, '');
  return CHAPTER_BY_ID.has(id) ? id : null;
}

// hash 路由：#/chapter-id。初始优先级：URL hash > 进度中的 lastPosition > 第 00 章。
export function useChapter(): { chapter: Chapter; navigate: (id: string) => void } {
  const [chapterId, setChapterId] = useState<string>(CHAPTERS[0].id);

  useEffect(() => {
    const fromHash = readHash();
    const initial = fromHash ?? getSnapshot().lastPosition ?? CHAPTERS[0].id;
    const valid = CHAPTER_BY_ID.has(initial) ? initial : CHAPTERS[0].id;
    setChapterId(valid);
    if (!fromHash) window.history.replaceState(null, '', `#/${valid}`);
    const onHashChange = () => {
      const id = readHash();
      if (id) setChapterId(id);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // 章节切换副作用：记录最后位置 + 标记 reading（不会降级 complete）+ 回到顶部
  useEffect(() => {
    setLastPosition(chapterId);
    markChapterReading(chapterId);
    window.scrollTo({ top: 0 });
  }, [chapterId]);

  const navigate = useCallback((id: string) => {
    if (!CHAPTER_BY_ID.has(id)) return;
    if (readHash() !== id) window.location.hash = `/${id}`;
    setChapterId(id);
  }, []);

  return { chapter: CHAPTER_BY_ID.get(chapterId) ?? CHAPTERS[0], navigate };
}
