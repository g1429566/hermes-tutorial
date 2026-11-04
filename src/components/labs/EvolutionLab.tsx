'use client';

import { useState } from 'react';
import { useLang } from '@/lib/i18n';
import Quiz from '../Quiz';
import { Stepper } from './primitives';

const STEPS = [
  {
    id: 'feedback',
    zh: '获得反馈',
    en: 'Feedback',
    body: [
      '输入 100、缺失、120。用户要求排除缺失并报告条数。总和 220 只是一个验收项，还要得到有效 2 条、缺失 1 条。',
      'For 100, missing, 120, verify sum 220, valid count 2, and missing count 1. A correct sum alone does not establish policy compliance.',
    ],
  },
  {
    id: 'route',
    zh: '确定去向',
    en: 'Choose a store',
    body: [
      '缺失值处理是 CSV 报告的流程规则，先找相关技能；语言等跨任务偏好才适合 USER.md。一次性数值留在会话历史。',
      'The missing-value procedure belongs in the reporting skill. Cross-task preferences can belong in USER.md; temporary totals stay in history.',
    ],
  },
  {
    id: 'write',
    zh: '读取再修订',
    en: 'Read and revise',
    body: [
      '先读已有技能，修正误导性的步骤，再检查 skill_manage 的实际结果。待审批是提案，不是已应用。',
      'Read the existing skill and fix the misleading step. Inspect the actual skill_manage result: pending approval is a proposal, not an applied update.',
    ],
  },
  {
    id: 'reuse',
    zh: '下次读取',
    en: 'Read next time',
    body: [
      '新任务调用或读取修订后的技能，操作知识才进入这次上下文。写到磁盘不等于所有已打开会话都自动替换旧内容。',
      'A later task must invoke or read the revised skill. Saving to disk does not automatically replace content in every open session.',
    ],
  },
  {
    id: 'verify',
    zh: '验证变式',
    en: 'Verify a variation',
    body: [
      '改用 10、缺失、缺失、30：应得总和 40、有效 2 条、缺失 2 条；再检查非法非空数字是否被明确报告。',
      'Try 10, missing, missing, 30: sum 40, valid count 2, missing count 2. Also verify explicit reporting of nonempty invalid values.',
    ],
  },
];

export default function EvolutionLab() {
  const { lang } = useLang();
  const [id, setId] = useState('feedback');
  const step = STEPS.find((s) => s.id === id) ?? STEPS[0];
  const zh = lang === 'zh';
  return (
    <section className="mt-8 max-w-3xl">
      <p className="mb-5 leading-relaxed text-muted">
        {zh
          ? '这是一次经验整理的纸上推演。每步先预测要改变哪个对象，再阅读说明；不会运行真实后台复盘。'
          : 'A paper trace of one lesson update. Predict which object changes at each step; this does not run real background review.'}
      </p>
      <Stepper
        steps={STEPS.map((s) => ({ id: s.id, label: zh ? s.zh : s.en }))}
        current={id}
        onChange={setId}
      />
      <div className="mt-5 rounded-lg border border-line bg-white p-6">
        <h3 className="font-serif text-2xl">{zh ? step.zh : step.en}</h3>
        <p className="mt-3 leading-relaxed">{step.body[zh ? 0 : 1]}</p>
      </div>
      <div className="mt-8">
        <Quiz
          item={{
            id: 'evolution-contract',
            question: zh
              ? '哪些证据有助于证明一次技能更新已经改善了后续工作？'
              : 'Which evidence supports improvement from a skill update?',
            options: [
              {
                key: 'a',
                text: zh
                  ? '真实工具结果表明修订已应用，后续任务确实读取了它。'
                  : 'A real write result confirms application, and the later task read the revision.',
              },
              { key: 'b', text: zh ? '模型说“我已经学会了”。' : 'The model says “I learned it.”' },
              {
                key: 'c',
                text: zh
                  ? '在固定模型与规则下，新输入的结果和异常处理都通过核验。'
                  : 'With model and rules held fixed, new inputs pass output and error-handling checks.',
              },
              {
                key: 'd',
                text: zh ? '技能文件数量增加。' : 'The number of skill files increased.',
              },
            ],
            correct: ['a', 'c'],
            multiple: true,
            explanation: zh
              ? '应用、读取、效果分别需要证据。回复中的承诺和文件数量不能代替实际保存或质量评测。'
              : 'Application, reading, and effect need separate evidence. A claim or a file count cannot replace persistence and quality checks.',
          }}
        />
      </div>
    </section>
  );
}
