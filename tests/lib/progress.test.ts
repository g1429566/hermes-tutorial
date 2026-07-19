import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearProgress,
  completedCount,
  getSnapshot,
  isComplete,
  setItem,
  subscribe,
} from '../../src/lib/progress';

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('progress store', () => {
  it('starts empty', () => {
    expect(completedCount()).toBe(0);
    expect(isComplete('checkpoint:x')).toBe(false);
  });

  it('sets and reads an item', () => {
    setItem('checkpoint:install', true);
    expect(isComplete('checkpoint:install')).toBe(true);
    expect(completedCount()).toBe(1);
  });

  it('persists to localStorage under the versioned key', () => {
    setItem('tryit:first', true);
    const raw = localStorage.getItem('hermes-tutorial:progress:v1');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).items['tryit:first']).toBe(true);
  });

  it('loads existing progress from localStorage on init', async () => {
    localStorage.setItem(
      'hermes-tutorial:progress:v1',
      JSON.stringify({ items: { 'checkpoint:old': true } }),
    );
    vi.resetModules();
    const mod = await import('../../src/lib/progress');
    expect(mod.completedCount()).toBe(1);
    expect(mod.isComplete('checkpoint:old')).toBe(true);
  });

  it('notifies subscribers on change and supports unsubscribe', () => {
    let calls = 0;
    const unsub = subscribe(() => calls++);
    setItem('checkpoint:a', true);
    setItem('checkpoint:a', true); // no-op: same value, no emit
    expect(calls).toBe(1);
    unsub();
    setItem('checkpoint:b', true);
    expect(calls).toBe(1); // unsubscribed
  });

  it('clears all progress', () => {
    setItem('checkpoint:a', true);
    clearProgress();
    expect(completedCount()).toBe(0);
    expect(getSnapshot().items).toEqual({});
  });

  it('degrades gracefully when localStorage throws', () => {
    const original = globalThis.localStorage.setItem;
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: () => {
        throw new Error('quota / private mode');
      },
    });
    expect(() => setItem('checkpoint:safe', true)).not.toThrow();
    expect(isComplete('checkpoint:safe')).toBe(true); // still tracked in-memory
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: original,
    });
  });
});
