export interface MemoryExercise {
  disk: boolean;
  snapshot: boolean;
  pending: boolean;
  session: number;
  outcome: 'initial' | 'staged' | 'saved' | 'started';
}

export type MemoryAction = 'save' | 'stage' | 'approve' | 'new-session' | 'reset';

export const INITIAL_MEMORY_EXERCISE: MemoryExercise = {
  disk: false,
  snapshot: false,
  pending: false,
  session: 1,
  outcome: 'initial',
};

// A bounded teaching model: it does not access real profiles, files, or model tools.
export function advanceMemory(state: MemoryExercise, action: MemoryAction): MemoryExercise {
  const transitions = {
    save: () => ({ ...state, disk: true, outcome: 'saved' as const }),
    stage: () => ({ ...state, pending: true, outcome: 'staged' as const }),
    approve: () =>
      state.pending ? { ...state, disk: true, pending: false, outcome: 'saved' as const } : state,
    'new-session': () => ({
      ...state,
      snapshot: state.disk,
      session: state.session + 1,
      outcome: 'started' as const,
    }),
    reset: () => INITIAL_MEMORY_EXERCISE,
  };
  return transitions[action]();
}
