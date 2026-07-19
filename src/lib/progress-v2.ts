// 进度系统 v2：版本化 localStorage store。
// 复用 v1（src/lib/progress.ts）的架构（单一模块状态 + subscribe/getSnapshot），
// 维度扩展为：章节状态 / 测验成绩 / 实验室快照 / 最后位置，支持导出 / 导入 / 重置。
// 首次初始化时自动检测 v1 key 并迁移（非破坏性：v1 key 保留）。

export const V2_STORAGE_KEY = 'hermes-tutorial:progress:v2';
const V1_STORAGE_KEY = 'hermes-tutorial:progress:v1';

export type ChapterStatus = 'not-started' | 'reading' | 'complete';

export interface QuizScore {
  correct: number;
  total: number;
  timestamp: number;
}

export interface ProgressStateV2 {
  version: 2;
  chapters: Record<string, ChapterStatus>;
  quizScores: Record<string, QuizScore>;
  labResults: Record<string, unknown>;
  lastPosition: string | null;
  lastVisited: number | null;
}

const EMPTY_V2: ProgressStateV2 = {
  version: 2,
  chapters: {},
  quizScores: {},
  labResults: {},
  lastPosition: null,
  lastVisited: null,
};

// v1 checkpoint id → v2 章节 id（v1 的「认识 Hermes」≈ v2 第 02 章功能全景，
// v1 的「安装与第一次对话」≈ v2 第 03 章）。
const V1_CHECKPOINT_TO_CHAPTER: Record<string, string> = {
  'checkpoint:what-is-hermes': 'features',
  'checkpoint:install-and-first-chat': 'install',
};

const CHAPTER_STATUSES: readonly ChapterStatus[] = ['not-started', 'reading', 'complete'];

const listeners = new Set<() => void>();
let state: ProgressStateV2 = read();

function isValidState(parsed: unknown): parsed is ProgressStateV2 {
  if (!parsed || typeof parsed !== 'object') return false;
  const p = parsed as Record<string, unknown>;
  if (p.version !== 2) return false;
  if (!p.chapters || typeof p.chapters !== 'object') return false;
  for (const status of Object.values(p.chapters as Record<string, unknown>)) {
    if (!CHAPTER_STATUSES.includes(status as ChapterStatus)) return false;
  }
  if (!p.quizScores || typeof p.quizScores !== 'object') return false;
  if (!p.labResults || typeof p.labResults !== 'object') return false;
  return true;
}

// v1 → v2 迁移：checkpoint 映射到对应章节，quiz 记录折算为 1/1 成绩，
// tryit 勾选折算为实验室快照。返回 null 表示没有可迁移的 v1 数据。
function migrateV1(): ProgressStateV2 | null {
  try {
    const raw = localStorage.getItem(V1_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object' || !parsed.items) return null;
    const items = parsed.items as Record<string, boolean>;
    const migrated: ProgressStateV2 = { ...EMPTY_V2, chapters: {}, quizScores: {}, labResults: {} };
    const now = Date.now();
    let found = false;
    for (const [key, value] of Object.entries(items)) {
      if (value !== true) continue;
      if (key in V1_CHECKPOINT_TO_CHAPTER) {
        migrated.chapters[V1_CHECKPOINT_TO_CHAPTER[key]] = 'complete';
        found = true;
      } else if (key.startsWith('quiz:')) {
        migrated.quizScores[key.slice('quiz:'.length)] = { correct: 1, total: 1, timestamp: now };
        found = true;
      } else if (key.startsWith('tryit:')) {
        migrated.labResults[key] = true;
        found = true;
      }
    }
    if (!found) return null;
    migrated.lastVisited = now;
    return migrated;
  } catch {
    return null;
  }
}

function read(): ProgressStateV2 {
  if (typeof localStorage === 'undefined') return EMPTY_V2;
  try {
    const raw = localStorage.getItem(V2_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) return parsed;
      return EMPTY_V2;
    }
    // v2 不存在 → 尝试 v1 迁移；迁移成功立即持久化（时间戳稳定、不重复迁移）
    const migrated = migrateV1();
    if (migrated) {
      try {
        localStorage.setItem(V2_STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        // storage 不可用——迁移结果仅保留在内存中
      }
      return migrated;
    }
    return EMPTY_V2;
  } catch {
    return EMPTY_V2;
  }
}

function write(): void {
  try {
    localStorage.setItem(V2_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage 不可用（隐私模式 / 配额）——仅保留内存状态
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

function update(next: ProgressStateV2): void {
  state = next;
  write();
  emit();
}

export function getSnapshot(): ProgressStateV2 {
  return state;
}

// SSR / 构建期预渲染使用的稳定空快照。
export function getServerSnapshot(): ProgressStateV2 {
  return EMPTY_V2;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getChapterStatus(id: string): ChapterStatus {
  return state.chapters[id] ?? 'not-started';
}

export function setChapterStatus(id: string, status: ChapterStatus): void {
  if (state.chapters[id] === status) return;
  update({ ...state, chapters: { ...state.chapters, [id]: status } });
}

export function markChapterReading(id: string): void {
  if (getChapterStatus(id) !== 'not-started') return;
  setChapterStatus(id, 'reading');
}

export function markChapterComplete(id: string): void {
  setChapterStatus(id, 'complete');
}

export function recordQuizScore(id: string, correct: number, total: number): void {
  update({
    ...state,
    quizScores: {
      ...state.quizScores,
      [id]: { correct, total, timestamp: Date.now() },
    },
  });
}

export function setLabResult(id: string, value: unknown): void {
  update({ ...state, labResults: { ...state.labResults, [id]: value } });
}

export function setLastPosition(chapterId: string): void {
  update({ ...state, lastPosition: chapterId, lastVisited: Date.now() });
}

export function completedChapters(): number {
  return Object.values(state.chapters).filter((s) => s === 'complete').length;
}

export function exportProgress(): string {
  return JSON.stringify(state, null, 2);
}

// 导入完整状态（覆盖当前进度）。校验失败返回 false，当前状态不变。
export function importProgress(json: string): boolean {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isValidState(parsed)) return false;
    update(parsed);
    return true;
  } catch {
    return false;
  }
}

export function resetProgress(): void {
  update(EMPTY_V2);
}
