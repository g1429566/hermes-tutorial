import { describe, expect, it } from 'vitest';
import { explainCron } from '../../src/lib/cron-explain';

// Chapter 12「Cron 定时调度」表达式解释器的纯函数测试。
// 覆盖：* / 步长 / 单值 / 逗号列表 / 区间 五类合法形态 + 字段数 / 越界 / 语法错误。
describe('explainCron', () => {
  it('explains the classic daily schedule "0 9 * * *"', () => {
    const r = explainCron('0 9 * * *');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields).toHaveLength(5);
    expect(r.fields.map((f) => f.label)).toEqual(['分', '时', '日', '月', '周']);
    expect(r.fields[0].explanation).toBe('第 0 分钟');
    expect(r.fields[1].explanation).toBe('9 点');
    expect(r.fields[2].explanation).toBe('每天');
    expect(r.fields[3].explanation).toBe('每月');
    expect(r.fields[4].explanation).toBe('不限星期');
  });

  it('explains step expressions like "*/5 * * * *"', () => {
    const r = explainCron('*/5 * * * *');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields[0].explanation).toBe('每 5 分钟');
    expect(r.fields[1].explanation).toBe('每小时');
  });

  it('explains an hour range "*/15 9-18 * * *"', () => {
    const r = explainCron('*/15 9-18 * * *');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields[0].explanation).toBe('每 15 分钟');
    expect(r.fields[1].explanation).toBe('9 点到 18 点');
  });

  it('explains comma lists "0 9,18 * * *"', () => {
    const r = explainCron('0 9,18 * * *');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields[1].explanation).toBe('9 点、18 点');
  });

  it('explains weekday ranges "0 9 * * 1-5"', () => {
    const r = explainCron('0 9 * * 1-5');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields[4].explanation).toBe('周一到周五');
  });

  it('treats both 0 and 7 as Sunday in the day-of-week field', () => {
    for (const expr of ['0 9 * * 0', '0 9 * * 7']) {
      const r = explainCron(expr);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.fields[4].explanation).toBe('周日');
    }
  });

  it('explains day-of-month and month single values "30 14 1 6 *"', () => {
    const r = explainCron('30 14 1 6 *');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields[0].explanation).toBe('第 30 分钟');
    expect(r.fields[1].explanation).toBe('14 点');
    expect(r.fields[2].explanation).toBe('每月 1 日');
    expect(r.fields[3].explanation).toBe('6 月');
  });

  it('rejects expressions with the wrong field count', () => {
    const r = explainCron('0 9 * *');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('5 个字段');
    expect(r.error).toContain('4');
  });

  it('rejects an empty expression', () => {
    const r = explainCron('   ');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('5 个字段');
  });

  it('rejects out-of-range values', () => {
    for (const expr of ['60 9 * * *', '0 24 * * *', '0 9 0 * *', '0 9 * 13 *', '0 9 * * 8']) {
      const r = explainCron(expr);
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.error).toContain('超出范围');
    }
  });

  it('rejects unrecognized tokens', () => {
    const r = explainCron('0 9 * * x');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('无法识别');
    expect(r.error).toContain('周');
  });

  it('rejects a zero step', () => {
    const r = explainCron('*/0 * * * *');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('步长');
  });

  it('rejects reversed ranges', () => {
    const r = explainCron('0 9 * * 5-1');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('起点不能大于终点');
  });
});
