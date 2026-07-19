// Chapter 26「自我评估与面试清单」的纯函数聚合逻辑。
// 自评档位：0 未评估 / 1 能讲清 / 2 能设计 / 3 能答追问。
// 组件只负责渲染与持久化，百分比、分布、薄弱项全部在这里算，便于单测。

export type AssessmentLevel = 0 | 1 | 2 | 3;

export const MAX_LEVEL: AssessmentLevel = 3;

// 薄弱项阈值：档位低于 2（不含「能设计」）即视为需要回炉。
export const WEAK_THRESHOLD: AssessmentLevel = 2;

// 把任意输入规整为合法档位：非数字、NaN、负数一律归 0，超过上限截断到 3。
export function clampLevel(value: unknown): AssessmentLevel {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= MAX_LEVEL) return MAX_LEVEL;
  return Math.floor(value) as AssessmentLevel;
}

function levelOf(levels: Record<string, number>, id: string): AssessmentLevel {
  return clampLevel(levels[id]);
}

// 已评估主题数（档位 > 0）。
export function answeredCount(levels: Record<string, number>, topicIds: string[]): number {
  return topicIds.filter((id) => levelOf(levels, id) > 0).length;
}

// 总掌握度百分比：已获档位之和 / 满分（主题数 × 3），四舍五入到整数。
// 没有主题时返回 0；未知 id 一律忽略。
export function completionPercent(levels: Record<string, number>, topicIds: string[]): number {
  if (topicIds.length === 0) return 0;
  const sum = topicIds.reduce((acc, id) => acc + levelOf(levels, id), 0);
  return Math.round((sum / (topicIds.length * MAX_LEVEL)) * 100);
}

// 按档位统计主题数量（未评估的主题计入 0 档）。
export function levelDistribution(
  levels: Record<string, number>,
  topicIds: string[],
): Record<AssessmentLevel, number> {
  const dist: Record<AssessmentLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const id of topicIds) {
    dist[levelOf(levels, id)] += 1;
  }
  return dist;
}

// 薄弱项：档位 < 2 的主题 id，保持传入顺序（未评估也算薄弱）。
export function weakTopicIds(levels: Record<string, number>, topicIds: string[]): string[] {
  return topicIds.filter((id) => levelOf(levels, id) < WEAK_THRESHOLD);
}
