// Chapter 12「Cron 定时调度」：5 字段 cron 表达式的纯函数解释器。
// 输入形如 "0 9 * * *" 的表达式，输出每个字段（分/时/日/月/周）的解释或错误。
// 支持语法：*、*/n（步长）、单值、逗号列表、区间 a-b——与 cron/jobs.py 接受的
// 5-field cron 格式对齐（Hermes 另支持时长 / every 短语 / ISO 一次性时间戳，见 cron.ts）。
// 解释文案按调用方传入的语言返回（默认中文）。

import type { Lang } from '@/lib/i18n';

export interface CronFieldExplanation {
  key: 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';
  label: string; // 分 / 时 / 日 / 月 / 周
  raw: string; // 原始字段文本
  explanation: string; // 按 lang 生成的解释
}

export type CronExplainResult =
  { ok: true; fields: CronFieldExplanation[] } | { ok: false; error: string };

interface FieldSpec {
  key: CronFieldExplanation['key'];
  label: string;
  min: number;
  max: number;
  star: string; // "*" 的解释
  stepUnit: string; // "*/n" 的单位
  describe: (v: number) => string; // 单值描述
  describeRange: (a: number, b: number) => string;
}

const DOW_NAMES: Record<Lang, string[]> = {
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

function dowName(v: number, lang: Lang): string {
  // cron 约定：0 与 7 都是周日
  return DOW_NAMES[lang][v === 7 ? 0 : v];
}

const FIELD_SPECS: Record<Lang, FieldSpec[]> = {
  zh: [
    {
      key: 'minute',
      label: '分',
      min: 0,
      max: 59,
      star: '每分钟',
      stepUnit: '分钟',
      describe: (v) => `第 ${v} 分钟`,
      describeRange: (a, b) => `第 ${a} 到 ${b} 分钟`,
    },
    {
      key: 'hour',
      label: '时',
      min: 0,
      max: 23,
      star: '每小时',
      stepUnit: '小时',
      describe: (v) => `${v} 点`,
      describeRange: (a, b) => `${a} 点到 ${b} 点`,
    },
    {
      key: 'dayOfMonth',
      label: '日',
      min: 1,
      max: 31,
      star: '每天',
      stepUnit: '天',
      describe: (v) => `每月 ${v} 日`,
      describeRange: (a, b) => `每月 ${a} 日到 ${b} 日`,
    },
    {
      key: 'month',
      label: '月',
      min: 1,
      max: 12,
      star: '每月',
      stepUnit: '个月',
      describe: (v) => `${v} 月`,
      describeRange: (a, b) => `${a} 月到 ${b} 月`,
    },
    {
      key: 'dayOfWeek',
      label: '周',
      min: 0,
      max: 7,
      star: '不限星期',
      stepUnit: '天（星期字段）',
      describe: (v) => dowName(v, 'zh'),
      describeRange: (a, b) => `${dowName(a, 'zh')}到${dowName(b, 'zh')}`,
    },
  ],
  en: [
    {
      key: 'minute',
      label: 'minute',
      min: 0,
      max: 59,
      star: 'every minute',
      stepUnit: 'minutes',
      describe: (v) => `at minute ${v}`,
      describeRange: (a, b) => `at minutes ${a} through ${b}`,
    },
    {
      key: 'hour',
      label: 'hour',
      min: 0,
      max: 23,
      star: 'every hour',
      stepUnit: 'hours',
      describe: (v) => `at ${v}:00`,
      describeRange: (a, b) => `from ${a}:00 to ${b}:00`,
    },
    {
      key: 'dayOfMonth',
      label: 'day of month',
      min: 1,
      max: 31,
      star: 'every day',
      stepUnit: 'days',
      describe: (v) => `on day ${v} of the month`,
      describeRange: (a, b) => `on days ${a}–${b} of the month`,
    },
    {
      key: 'month',
      label: 'month',
      min: 1,
      max: 12,
      star: 'every month',
      stepUnit: 'months',
      describe: (v) => `in month ${v}`,
      describeRange: (a, b) => `in months ${a}–${b}`,
    },
    {
      key: 'dayOfWeek',
      label: 'day of week',
      min: 0,
      max: 7,
      star: 'any day of the week',
      stepUnit: 'days (day-of-week field)',
      describe: (v) => dowName(v, 'en'),
      describeRange: (a, b) => `${dowName(a, 'en')} to ${dowName(b, 'en')}`,
    },
  ],
};

// 解释单个字段。越界/非法直接抛 Error 带出原因（语言随调用方）。
function explainField(spec: FieldSpec, raw: string, lang: Lang): string {
  if (raw === '*') return spec.star;

  const step = /^\*\/(\d+)$/.exec(raw);
  if (step) {
    const n = Number(step[1]);
    if (n < 1) {
      throw new Error(
        lang === 'en'
          ? `Invalid step ${n} in the ${spec.label} field: step must be ≥ 1`
          : `${spec.label}字段步长 ${n} 无效：步长必须 ≥ 1`,
      );
    }
    return lang === 'en' ? `every ${n} ${spec.stepUnit}` : `每 ${n} ${spec.stepUnit}`;
  }

  const rangeError = (v: number): Error =>
    new Error(
      lang === 'en'
        ? `Value ${v} in the ${spec.label} field is out of range (${spec.min}–${spec.max})`
        : `${spec.label}字段值 ${v} 超出范围（${spec.min}–${spec.max}）`,
    );

  const parseValue = (token: string): number | null => {
    if (!/^\d+$/.test(token)) return null;
    const v = Number(token);
    if (v < spec.min || v > spec.max) throw rangeError(v);
    return v;
  };

  const parseItem = (token: string): string | null => {
    const range = /^(\d+)-(\d+)$/.exec(token);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (const v of [a, b]) {
        if (v < spec.min || v > spec.max) throw rangeError(v);
      }
      if (a > b) {
        throw new Error(
          lang === 'en'
            ? `Invalid range ${a}-${b} in the ${spec.label} field: start must not exceed end`
            : `${spec.label}字段区间 ${a}-${b} 无效：起点不能大于终点`,
        );
      }
      return spec.describeRange(a, b);
    }
    const v = parseValue(token);
    return v === null ? null : spec.describe(v);
  };

  const items = raw.split(',');
  const parts: string[] = [];
  for (const item of items) {
    const explained = parseItem(item);
    if (explained === null) {
      throw new Error(
        lang === 'en'
          ? `Unrecognized ${spec.label} field "${raw}": supports *, */n, single values, comma lists, ranges a-b`
          : `${spec.label}字段「${raw}」无法识别：支持 *、*/n、单值、逗号列表、区间 a-b`,
      );
    }
    parts.push(explained);
  }
  return parts.join(lang === 'en' ? ', ' : '、');
}

export function explainCron(expression: string, lang: Lang = 'zh'): CronExplainResult {
  const specs = FIELD_SPECS[lang];
  const tokens = expression.trim().split(/\s+/).filter(Boolean);
  if (tokens.length !== specs.length) {
    return {
      ok: false,
      error:
        lang === 'en'
          ? `A cron expression needs 5 fields (minute hour day month weekday), got ${tokens.length}`
          : `cron 表达式需要 5 个字段（分 时 日 月 周），当前为 ${tokens.length} 个`,
    };
  }
  try {
    const fields = specs.map((spec, i) => ({
      key: spec.key,
      label: spec.label,
      raw: tokens[i],
      explanation: explainField(spec, tokens[i], lang),
    }));
    return { ok: true, fields };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
