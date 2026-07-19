import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completedChapters,
  exportProgress,
  getChapterStatus,
  getSnapshot,
  importProgress,
  markChapterComplete,
  markChapterReading,
  recordQuizScore,
  resetProgress,
  setChapterStatus,
  setLabResult,
  setLastPosition,
  subscribe,
  V2_STORAGE_KEY,
} from '../../src/lib/progress-v2';

beforeEach(() => {
  localStorage.clear();
  resetProgress();
});

describe('progress v2 store', () => {
  it('starts empty', () => {
    expect(completedChapters()).toBe(0);
    expect(getChapterStatus('map')).toBe('not-started');
    expect(getSnapshot()).toEqual({
      version: 2,
      chapters: {},
      quizScores: {},
      labResults: {},
      lastPosition: null,
      lastVisited: null,
    });
  });

  it('tracks chapter status and counts only complete chapters', () => {
    markChapterReading('map');
    expect(getChapterStatus('map')).toBe('reading');
    expect(completedChapters()).toBe(0);
    markChapterComplete('map');
    markChapterComplete('install');
    expect(getChapterStatus('map')).toBe('complete');
    expect(completedChapters()).toBe(2);
  });

  it('markChapterReading never downgrades a complete chapter', () => {
    markChapterComplete('map');
    markChapterReading('map');
    expect(getChapterStatus('map')).toBe('complete');
  });

  it('setChapterStatus can reset a chapter to not-started', () => {
    markChapterComplete('map');
    setChapterStatus('map', 'not-started');
    expect(getChapterStatus('map')).toBe('not-started');
    expect(completedChapters()).toBe(0);
  });

  it('persists to localStorage under the v2 key', () => {
    markChapterComplete('map');
    const raw = localStorage.getItem(V2_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.chapters.map).toBe('complete');
  });

  it('loads existing v2 state from localStorage on init', async () => {
    localStorage.setItem(
      V2_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        chapters: { map: 'complete' },
        quizScores: { q1: { correct: 1, total: 1, timestamp: 1 } },
        labResults: {},
        lastPosition: 'map',
        lastVisited: 1,
      }),
    );
    vi.resetModules();
    const mod = await import('../../src/lib/progress-v2');
    expect(mod.completedChapters()).toBe(1);
    expect(mod.getChapterStatus('map')).toBe('complete');
    expect(mod.getSnapshot().lastPosition).toBe('map');
  });

  it('records quiz scores and lab results', () => {
    recordQuizScore('what-is-hermes-1', 1, 1);
    setLabResult('tryit:install', true);
    const s = getSnapshot();
    expect(s.quizScores['what-is-hermes-1'].correct).toBe(1);
    expect(s.quizScores['what-is-hermes-1'].total).toBe(1);
    expect(typeof s.quizScores['what-is-hermes-1'].timestamp).toBe('number');
    expect(s.labResults['tryit:install']).toBe(true);
  });

  it('records last position with a timestamp', () => {
    setLastPosition('features');
    const s = getSnapshot();
    expect(s.lastPosition).toBe('features');
    expect(typeof s.lastVisited).toBe('number');
  });

  it('exports and imports a full state roundtrip', () => {
    markChapterComplete('map');
    recordQuizScore('q1', 0, 1);
    setLabResult('lab:x', { step: 2 });
    setLastPosition('install');
    const json = exportProgress();

    resetProgress();
    expect(completedChapters()).toBe(0);

    expect(importProgress(json)).toBe(true);
    expect(completedChapters()).toBe(1);
    expect(getSnapshot().quizScores.q1.total).toBe(1);
    expect(getSnapshot().labResults['lab:x']).toEqual({ step: 2 });
    expect(getSnapshot().lastPosition).toBe('install');
  });

  it('rejects invalid imports without touching current state', () => {
    markChapterComplete('map');
    expect(importProgress('not json')).toBe(false);
    expect(importProgress('{"version":1,"items":{}}')).toBe(false);
    expect(importProgress('{"version":2,"chapters":{"map":"bogus"}}')).toBe(false);
    expect(getChapterStatus('map')).toBe('complete');
  });

  it('resets all v2 progress', () => {
    markChapterComplete('map');
    recordQuizScore('q1', 1, 1);
    resetProgress();
    expect(completedChapters()).toBe(0);
    expect(getSnapshot().quizScores).toEqual({});
  });

  it('migrates v1 progress on first init', async () => {
    localStorage.setItem(
      'hermes-tutorial:progress:v1',
      JSON.stringify({
        items: {
          'checkpoint:what-is-hermes': true,
          'checkpoint:install-and-first-chat': true,
          'quiz:what-is-hermes-1': true,
          'tryit:install': true,
        },
      }),
    );
    // beforeEach 的 resetProgress 会写入空 v2 key——移除它以模拟 v1 老用户首次访问
    localStorage.removeItem(V2_STORAGE_KEY);
    vi.resetModules();
    const mod = await import('../../src/lib/progress-v2');
    expect(mod.getChapterStatus('features')).toBe('complete');
    expect(mod.getChapterStatus('install')).toBe('complete');
    expect(mod.getSnapshot().quizScores['what-is-hermes-1']).toMatchObject({
      correct: 1,
      total: 1,
    });
    expect(mod.getSnapshot().labResults['tryit:install']).toBe(true);
    // 迁移结果已写入 v2 key
    expect(localStorage.getItem(V2_STORAGE_KEY)).not.toBeNull();
  });

  it('skips migration when a v2 key already exists', async () => {
    localStorage.setItem(
      'hermes-tutorial:progress:v1',
      JSON.stringify({ items: { 'checkpoint:what-is-hermes': true } }),
    );
    localStorage.setItem(
      V2_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        chapters: { start: 'complete' },
        quizScores: {},
        labResults: {},
        lastPosition: null,
        lastVisited: null,
      }),
    );
    vi.resetModules();
    const mod = await import('../../src/lib/progress-v2');
    expect(mod.getChapterStatus('start')).toBe('complete');
    expect(mod.getChapterStatus('features')).toBe('not-started');
  });

  it('notifies subscribers on change and supports unsubscribe', () => {
    let calls = 0;
    const unsub = subscribe(() => calls++);
    markChapterComplete('map');
    markChapterComplete('map'); // no-op: same value, no emit
    expect(calls).toBe(1);
    unsub();
    markChapterComplete('install');
    expect(calls).toBe(1);
  });

  it('degrades gracefully when localStorage throws', () => {
    const original = globalThis.localStorage.setItem;
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: () => {
        throw new Error('quota / private mode');
      },
    });
    expect(() => markChapterComplete('map')).not.toThrow();
    expect(getChapterStatus('map')).toBe('complete'); // still tracked in-memory
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: original,
    });
  });
});
