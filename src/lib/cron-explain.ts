// Chapter 12「Cron 定时调度」：5 字段 cron 表达式的纯函数解释器。
// 输入形如 "0 9 * * *" 的表达式，输出每个字段（分/时/日/月/周）的中文解释或错误。
// 支持语法：*、*/n（步长）、单值、逗号列表、区间 a-b——与 cron/jobs.py 接受的
// 5-field cron 格式对齐（Hermes 另支持时长 / every 短语 / ISO 一次性时间戳，见 cron.ts）。

export interface CronFieldExplanation {
  key: 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';
  label: string; // 分 / 时 / 日 / 月 / 周
  raw: string; // 原始字段文本
  explanation: string; // 中文解释
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

const DOW_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function dowName(v: number): string {
  // cron 约定：0 与 7 都是周日
  return DOW_NAMES[v === 7 ? 0 : v];
}

const FIELD_SPECS: FieldSpec[] = [
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
    describe: dowName,
    describeRange: (a, b) => `${dowName(a)}到${dowName(b)}`,
  },
];

// 解释单个字段。返回 null 表示语法无法识别；越界/非法直接抛 Error 带出中文原因。
function explainField(spec: FieldSpec, raw: string): string {
  if (raw === '*') return spec.star;

  const step = /^\*\/(\d+)$/.exec(raw);
  if (step) {
    const n = Number(step[1]);
    if (n < 1) throw new Error(`${spec.label}字段步长 ${n} 无效：步长必须 ≥ 1`);
    return `每 ${n} ${spec.stepUnit}`;
  }

  const parseValue = (token: string): number | null => {
    if (!/^\d+$/.test(token)) return null;
    const v = Number(token);
    if (v < spec.min || v > spec.max) {
      throw new Error(`${spec.label}字段值 ${v} 超出范围（${spec.min}–${spec.max}）`);
    }
    return v;
  };

  const parseItem = (token: string): string | null => {
    const range = /^(\d+)-(\d+)$/.exec(token);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (const v of [a, b]) {
        if (v < spec.min || v > spec.max) {
          throw new Error(`${spec.label}字段值 ${v} 超出范围（${spec.min}–${spec.max}）`);
        }
      }
      if (a > b) {
        throw new Error(`${spec.label}字段区间 ${a}-${b} 无效：起点不能大于终点`);
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
      throw new Error(`${spec.label}字段「${raw}」无法识别：支持 *、*/n、单值、逗号列表、区间 a-b`);
    }
    parts.push(explained);
  }
  return parts.join('、');
}

export function explainCron(expression: string): CronExplainResult {
  const tokens = expression.trim().split(/\s+/).filter(Boolean);
  if (tokens.length !== FIELD_SPECS.length) {
    return {
      ok: false,
      error: `cron 表达式需要 5 个字段（分 时 日 月 周），当前为 ${tokens.length} 个`,
    };
  }
  try {
    const fields = FIELD_SPECS.map((spec, i) => ({
      key: spec.key,
      label: spec.label,
      raw: tokens[i],
      explanation: explainField(spec, tokens[i]),
    }));
    return { ok: true, fields };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
