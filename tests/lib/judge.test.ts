import { describe, expect, it } from 'vitest';
import { judge } from '../../src/lib/judge';

describe('judge', () => {
  it('single-choice: correct when exactly the right key', () => {
    expect(judge(['b'], ['b'], false)).toBe(true);
  });
  it('single-choice: wrong key', () => {
    expect(judge(['a'], ['b'], false)).toBe(false);
  });
  it('single-choice: selecting more than one is wrong', () => {
    expect(judge(['a', 'b'], ['b'], false)).toBe(false);
  });
  it('multiple-choice: all correct keys, no extras', () => {
    expect(judge(['a', 'c'], ['a', 'c'], true)).toBe(true);
  });
  it('multiple-choice: missing one is wrong', () => {
    expect(judge(['a'], ['a', 'c'], true)).toBe(false);
  });
  it('multiple-choice: an extra wrong key is wrong', () => {
    expect(judge(['a', 'c', 'd'], ['a', 'c'], true)).toBe(false);
  });
  it('empty selection is wrong', () => {
    expect(judge([], ['a'], false)).toBe(false);
  });
});
