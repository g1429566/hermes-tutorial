import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  clampLevel,
  completionPercent,
  levelDistribution,
  weakTopicIds,
} from '../../src/lib/assessment';

describe('clampLevel', () => {
  it('passes through valid levels and clamps out-of-range values', () => {
    expect(clampLevel(0)).toBe(0);
    expect(clampLevel(1)).toBe(1);
    expect(clampLevel(2)).toBe(2);
    expect(clampLevel(3)).toBe(3);
    expect(clampLevel(5)).toBe(3);
    expect(clampLevel(-2)).toBe(0);
  });

  it('normalizes non-numeric and fractional input to a safe level', () => {
    expect(clampLevel('2')).toBe(0);
    expect(clampLevel(null)).toBe(0);
    expect(clampLevel(undefined)).toBe(0);
    expect(clampLevel(NaN)).toBe(0);
    expect(clampLevel(Infinity)).toBe(0);
    expect(clampLevel(2.9)).toBe(2);
  });
});

describe('completionPercent', () => {
  it('returns 0 when there are no topics', () => {
    expect(completionPercent({}, [])).toBe(0);
    expect(completionPercent({ a: 3 }, [])).toBe(0);
  });

  it('computes the mastery percentage against the full score', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(completionPercent({ a: 3, b: 2, c: 0, d: 1 }, ids)).toBe(50);
    expect(completionPercent({ a: 3, b: 3, c: 3, d: 3 }, ids)).toBe(100);
    expect(completionPercent({}, ids)).toBe(0);
  });

  it('ignores unknown ids and treats missing entries as 0', () => {
    expect(completionPercent({ a: 3, ghost: 3 }, ['a', 'b'])).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    // 4 / 9 = 44.44… → 44；5 / 9 = 55.55… → 56
    expect(completionPercent({ a: 3, b: 1 }, ['a', 'b', 'c'])).toBe(44);
    expect(completionPercent({ a: 3, b: 2 }, ['a', 'b', 'c'])).toBe(56);
  });
});

describe('levelDistribution', () => {
  it('counts topics per level, with unassessed topics in level 0', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(levelDistribution({ a: 1, b: 3 }, ids)).toEqual({ 0: 2, 1: 1, 2: 0, 3: 1 });
  });

  it('clamps out-of-range values instead of miscounting', () => {
    expect(levelDistribution({ a: 9, b: -1 }, ['a', 'b'])).toEqual({ 0: 1, 1: 0, 2: 0, 3: 1 });
  });
});

describe('weakTopicIds', () => {
  it('returns topics below level 2 in input order, including unassessed ones', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(weakTopicIds({ a: 2, b: 1, c: 3 }, ids)).toEqual(['b', 'd']);
  });

  it('returns an empty list when every topic is at level 2 or above', () => {
    expect(weakTopicIds({ a: 2, b: 3 }, ['a', 'b'])).toEqual([]);
    expect(weakTopicIds({}, [])).toEqual([]);
  });
});

describe('answeredCount', () => {
  it('counts only topics with a positive level', () => {
    expect(answeredCount({ a: 1, b: 0, c: 2 }, ['a', 'b', 'c', 'd'])).toBe(2);
    expect(answeredCount({}, ['a'])).toBe(0);
  });
});
