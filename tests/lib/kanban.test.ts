import { describe, expect, it } from 'vitest';
import { INITIAL_CARDS, moveKanbanCard } from '@/data/kanban';

describe('kanban dependency exercise', () => {
  it('waits for a running prerequisite after the external blocker clears', () => {
    const unblocked = moveKanbanCard(INITIAL_CARDS, 'T-105', 'ready');
    expect(unblocked.find((card) => card.id === 'T-105')?.column).toBe('todo');
    const finished = moveKanbanCard(unblocked, 'T-104', 'done');
    expect(finished.find((card) => card.id === 'T-105')?.column).toBe('ready');
  });

  it('keeps an external blocker after the parent finishes until the orchestrator unblocks it', () => {
    const finished = moveKanbanCard(INITIAL_CARDS, 'T-104', 'done');
    expect(finished.find((card) => card.id === 'T-105')?.column).toBe('blocked');
    const unblocked = moveKanbanCard(finished, 'T-105', 'ready');
    expect(unblocked.find((card) => card.id === 'T-105')?.column).toBe('ready');
  });
});
