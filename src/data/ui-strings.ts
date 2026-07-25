// 站点框架（chrome）共享 UI 文案词典：导航、章节骨架、Quiz、PyRunner、共享原语。
// 各章节实验室的专属文案随该章数据文件走（*_EN 平行导出），不放这里。

import type { Lang } from '@/lib/i18n';

export type UiStringId = keyof typeof UI_STRINGS;

export const UI_STRINGS = {
  // ── CourseNav ─────────────────────────────────────────────────
  siteKicker: { zh: 'HERMES // 教程', en: 'HERMES // TUTORIAL' },
  siteTitle: { zh: 'Hermes Agent 学习教程', en: 'Hermes Agent Tutorial' },
  progress: { zh: '进度', en: 'Progress' },
  chaptersCount: { zh: '章', en: 'chapters' },
  exportProgress: { zh: '导出', en: 'Export' },
  importProgress: { zh: '导入', en: 'Import' },
  resetProgress: { zh: '重置', en: 'Reset' },
  resetConfirm: {
    zh: '确定要重置全部学习进度吗？此操作不可撤销。',
    en: 'Reset all learning progress? This cannot be undone.',
  },
  importInvalid: {
    zh: '导入失败：文件不是有效的进度数据。',
    en: 'Import failed: the file is not valid progress data.',
  },
  importUnreadable: {
    zh: '导入失败：无法读取文件。',
    en: 'Import failed: could not read the file.',
  },
  statusComplete: { zh: '已完成', en: 'Complete' },
  statusReading: { zh: '在读', en: 'Reading' },
  statusNotStarted: { zh: '未开始', en: 'Not started' },
  openMenu: { zh: '打开目录', en: 'Open menu' },
  switchLang: { zh: 'EN', en: '中文' },
  switchLangLabel: { zh: 'Switch to English', en: '切换到中文' },

  // ── ChapterRenderer ───────────────────────────────────────────
  comingSoonKicker: { zh: 'COMING SOON', en: 'COMING SOON' },
  comingSoonTitle: { zh: '本章内容建设中', en: 'This chapter is under construction' },
  comingSoonBodyPrefix: { zh: '这一章属于', en: 'This chapter belongs to' },
  comingSoonBodySuffix: {
    zh: '， 将对照以下 hermes-agent 真实源码展开：',
    en: ' and will walk through these real hermes-agent source files:',
  },
  completeUndo: {
    zh: '✓ 本章已完成（点击撤销）',
    en: '✓ Chapter complete (click to undo)',
  },
  completeAndNext: { zh: '完成本章，继续下一章 →', en: 'Complete & continue →' },
  completeOnly: { zh: '完成本章', en: 'Mark complete' },

  // ── Quiz ─────────────────────────────────────────────────────
  quizMultiple: { zh: 'QUIZ · 多选', en: 'QUIZ · multi-select' },
  quizSingle: { zh: 'QUIZ', en: 'QUIZ' },
  quizSubmit: { zh: '提交', en: 'Submit' },
  quizCorrect: { zh: '✓ 正确！', en: '✓ Correct!' },
  quizIncorrect: { zh: '✗ 不完全正确', en: '✗ Not quite' },
  quizRetry: { zh: '重试', en: 'Retry' },

  // ── PyRunner ─────────────────────────────────────────────────
  pyRun: { zh: '▶ 运行', en: '▶ Run' },
  pyLoading: { zh: '加载运行时…', en: 'Loading runtime…' },
  pyRunning: { zh: '运行中…', en: 'Running…' },
  pyNoOutput: { zh: '（无输出）', en: '(no output)' },
  pyFirstLoad: {
    zh: '首次运行需加载 Python 运行时（约 15MB，之后常驻）…',
    en: 'First run loads the Python runtime (~15MB, then cached)…',
  },
  pyExecuting: { zh: '执行中…', en: 'Executing…' },

  // ── 实验室通用 ────────────────────────────────────────────────
  keyPoints: { zh: '要点', en: 'Key takeaways' },
  eventFlow: { zh: '事件流', en: 'Event flow' },
  prevStep: { zh: '‹ 上一步', en: '‹ Prev' },
  nextStep: { zh: '下一步 ›', en: 'Next ›' },

  // ── primitives（FlipCard） ────────────────────────────────────
  flipCollapse: { zh: '▲ 收起思路', en: '▲ Hide the answer' },
  flipExpand: { zh: '▼ 点击翻转，看模范思路', en: '▼ Flip to see a model answer' },
} as const;

// 取一条 UI 文案：`t('zh', 'progress')` → '进度'。
export function t(lang: Lang, id: UiStringId): string {
  return UI_STRINGS[id][lang];
}
