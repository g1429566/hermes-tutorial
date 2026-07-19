const STORAGE_KEY = 'hermes-tutorial:progress:v1';

export interface ProgressState {
  items: Record<string, boolean>;
}

const EMPTY: ProgressState = { items: {} };
const listeners = new Set<() => void>();
let state: ProgressState = read();

function read(): ProgressState {
  if (typeof localStorage === 'undefined') return { items: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && parsed.items) {
      return { items: parsed.items as Record<string, boolean> };
    }
    return { items: {} };
  } catch {
    return { items: {} };
  }
}

function write(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode / quota) — keep state in-memory only
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

export function getSnapshot(): ProgressState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setItem(key: string, value: boolean): void {
  if (state.items[key] === value) return;
  state = { items: { ...state.items, [key]: value } };
  write();
  emit();
}

export function isComplete(key: string): boolean {
  return state.items[key] === true;
}

export function completedCount(): number {
  return Object.values(state.items).filter(Boolean).length;
}

export function clearProgress(): void {
  state = EMPTY;
  write();
  emit();
}
