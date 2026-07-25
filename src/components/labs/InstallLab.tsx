'use client';

import {
  CLI_COMMANDS,
  CLI_COMMANDS_EN,
  INSTALL_CHECKLIST,
  INSTALL_CHECKLIST_EN,
  INSTALL_QUIZ,
  INSTALL_QUIZ_EN,
  INSTALL_STEPS,
  INSTALL_STEPS_EN,
  INSTALL_UI,
} from '@/data/install';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';
import Quiz from '../Quiz';

// Chapter 03「安装与第一次对话」：TryIt 命令卡片 + 常用命令 + 安装检查清单。
// 「我跑过了」勾选与清单勾选都作为实验室快照持久化到 labResults。
export default function InstallLab() {
  const { lang } = useLang();
  const steps = lang === 'en' ? INSTALL_STEPS_EN : INSTALL_STEPS;
  const commands = lang === 'en' ? CLI_COMMANDS_EN : CLI_COMMANDS;
  const checklist = lang === 'en' ? INSTALL_CHECKLIST_EN : INSTALL_CHECKLIST;
  const quiz = lang === 'en' ? INSTALL_QUIZ_EN : INSTALL_QUIZ;
  const progress = useProgress();
  const labs = progress.labResults;

  function flag(key: string): boolean {
    return labs[key] === true;
  }
  function toggle(key: string) {
    setLabResult(key, !flag(key));
  }

  const checklistDone = checklist.filter((c) => flag(`check:${c.id}`)).length;

  return (
    <section className="mt-10 max-w-3xl">
      <p className="leading-relaxed text-ink/75">{pick(lang, INSTALL_UI.intro)}</p>

      <div className="mt-8 space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-line bg-white p-5">
            <p className="font-medium">{step.title}</p>
            <div className="mt-3 flex items-start gap-2 rounded bg-code-bg p-3.5">
              <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] text-acid">
                {step.command}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(step.command).catch(() => {
                    /* 剪贴板不可用——忽略 */
                  });
                }}
                className="shrink-0 rounded border border-white/25 px-2 py-0.5 font-mono text-[11px] text-white/70 hover:border-acid hover:text-acid"
              >
                {pick(lang, INSTALL_UI.copy)}
              </button>
            </div>
            {step.note && <p className="mt-2.5 text-sm text-muted">{step.note}</p>}
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={flag(`tryit:${step.id}`)}
                onChange={() => toggle(`tryit:${step.id}`)}
                className="accent-[#65a30d]"
              />
              {pick(lang, INSTALL_UI.tryIt)}
            </label>
          </div>
        ))}
      </div>

      <h3 className="mt-12 font-serif text-2xl">{pick(lang, INSTALL_UI.commonCommands)}</h3>
      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <tbody>
            {commands.map((c) => (
              <tr key={c.command} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-ember">
                  {c.command}
                </td>
                <td className="px-4 py-2.5 text-ink/75">{c.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-12 font-serif text-2xl">
        {pick(lang, INSTALL_UI.checklist)}
        <span className="ml-3 font-mono text-sm font-normal text-muted">
          {checklistDone}/{checklist.length}
        </span>
      </h3>
      <ul className="mt-4 space-y-2">
        {checklist.map((c) => (
          <li key={c.id}>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-2.5 text-sm transition-colors ${
                flag(`check:${c.id}`) ? 'border-green bg-green/5 text-ink' : 'border-line bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={flag(`check:${c.id}`)}
                onChange={() => toggle(`check:${c.id}`)}
                className="accent-[#16a34a]"
              />
              <span className={flag(`check:${c.id}`) ? 'line-through opacity-60' : ''}>
                {c.label}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <Quiz item={quiz} />
      </div>
    </section>
  );
}
