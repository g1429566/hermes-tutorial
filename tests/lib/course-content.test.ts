import { describe, expect, it } from 'vitest';
import { loadCourseLessons } from '@/lib/course-content';
import { CHAPTERS, nextChapter, prevChapter } from '@/data/chapters';
import { exportProgress, importProgress } from '@/lib/progress-v2';

describe('published course integration', () => {
  it('loads both languages for every reachable chapter and navigates in both directions', () => {
    const lessons = loadCourseLessons();
    expect(Object.keys(lessons).sort()).toEqual(CHAPTERS.map((c) => c.id).sort());
    for (const chapter of CHAPTERS) {
      expect(lessons[chapter.id].zh.trim()).not.toBe('');
      expect(lessons[chapter.id].en.trim()).not.toBe('');
      const next = nextChapter(chapter.id);
      if (next) expect(prevChapter(next.id)?.id).toBe(chapter.id);
    }
    const order = CHAPTERS.map((c) => c.id);
    for (const [before, after] of [
      ['tools', 'skills-1'],
      ['skills-1', 'memory'],
      ['memory', 'evolution'],
      ['evolution', 'skills-2'],
      ['evaluation', 'interview-design'],
    ]) {
      expect(order.indexOf(before)).toBeLessThan(order.indexOf(after));
    }
  });

  it('retains existing chapter progress when the reading order is reorganized', () => {
    const previous = exportProgress();
    try {
      expect(
        importProgress(
          JSON.stringify({
            version: 2,
            chapters: { memory: 'complete', 'skills-2': 'reading' },
            quizScores: {},
            labResults: { 'lab:memory': { layer: 'semantic' } },
            lastPosition: 'memory',
            lastVisited: null,
          }),
        ),
      ).toBe(true);
      const saved = JSON.parse(exportProgress());
      expect(saved.chapters.memory).toBe('complete');
      expect(saved.chapters['skills-2']).toBe('reading');
      expect(CHAPTERS.some((c) => c.id === saved.lastPosition)).toBe(true);
      expect(saved.labResults['lab:memory']).toEqual({ layer: 'semantic' });
    } finally {
      importProgress(previous);
    }
  });
});
