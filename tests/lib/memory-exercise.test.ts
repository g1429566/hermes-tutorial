import { describe, expect, it } from 'vitest';
import { advanceMemory, INITIAL_MEMORY_EXERCISE } from '@/lib/memory-exercise';

describe('memory learning exercise', () => {
  it('a pending write stays off disk and out of a new session until approval', () => {
    const pending = advanceMemory(INITIAL_MEMORY_EXERCISE, 'stage');
    const beforeApproval = advanceMemory(pending, 'new-session');
    expect(beforeApproval.disk).toBe(false);
    expect(beforeApproval.snapshot).toBe(false);
    expect(beforeApproval.pending).toBe(true);
    const approved = advanceMemory(beforeApproval, 'approve');
    expect(approved.disk).toBe(true);
    expect(approved.snapshot).toBe(beforeApproval.snapshot);
    expect(advanceMemory(approved, 'new-session').snapshot).toBe(approved.disk);
  });

  it('a successful save changes durable state without mutating the active snapshot', () => {
    const saved = advanceMemory(INITIAL_MEMORY_EXERCISE, 'save');
    expect(saved.disk).toBe(true);
    expect(saved.snapshot).toBe(INITIAL_MEMORY_EXERCISE.snapshot);
    expect(INITIAL_MEMORY_EXERCISE.disk).toBe(false);
    const next = advanceMemory(saved, 'new-session');
    expect(next.snapshot).toBe(saved.disk);
    expect(next.session).toBe(saved.session + 1);
  });
});
