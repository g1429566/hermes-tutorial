'use client';

import { useState } from 'react';
import {
  SKILL_BODY_SECTIONS,
  SKILL_EXAMPLE_YAML,
  SKILL_FORMAT_HOOK,
  SKILL_FORMAT_INTRO,
  SKILL_FRONTMATTER_FIELDS,
  SKILL_LOAD_STEPS,
} from '@/data/skills';
import { CodeBlock, Explorer, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 05「技能系统（上）」：技能格式浏览器。
// 上：SKILL.md frontmatter 字段逐个浏览（说明 + 校验规则 + 真实示例）；
// 下：技能加载流程五步步进器（扫描 → 解析 → 门控 → 注入 → 注册）。
export default function SkillFormatLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:skill-format'];
  const savedField =
    saved && typeof saved === 'object' && 'field' in saved && typeof saved.field === 'string'
      ? saved.field
      : SKILL_FRONTMATTER_FIELDS[0].id;
  const savedStep =
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : SKILL_LOAD_STEPS[0].id;
  const [fieldId, setFieldId] = useState(savedField);
  const [stepId, setStepId] = useState(savedStep);

  const field =
    SKILL_FRONTMATTER_FIELDS.find((f) => f.id === fieldId) ?? SKILL_FRONTMATTER_FIELDS[0];
  const step = SKILL_LOAD_STEPS.find((s) => s.id === stepId) ?? SKILL_LOAD_STEPS[0];
  const idx = SKILL_LOAD_STEPS.findIndex((s) => s.id === step.id);

  function selectField(id: string) {
    setFieldId(id);
    setLabResult('lab:skill-format', { field: id, step: stepId });
  }

  function selectStep(id: string) {
    setStepId(id);
    setLabResult('lab:skill-format', { field: fieldId, step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{SKILL_FORMAT_INTRO}</p>

      <SectionHeading kicker="Frontmatter" title="逐个字段拆开看" />
      <div className="mt-6">
        <Explorer
          items={SKILL_FRONTMATTER_FIELDS.map((f) => ({
            id: f.id,
            name: f.name,
            tagline: f.tagline,
          }))}
          current={field.id}
          onChange={selectField}
        >
          <div className="rounded-lg border border-line bg-white p-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <code className="font-mono text-lg text-ember">{field.name}</code>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${
                  field.required
                    ? 'border-ember/40 bg-ember/10 text-ember'
                    : 'border-line bg-paper-deep text-muted'
                }`}
              >
                {field.required ? '必填' : '可选'}
              </span>
            </div>
            <p className="mt-4 leading-relaxed text-ink/75">{field.purpose}</p>
            <h4 className="mt-6 font-mono text-xs tracking-[0.15em] text-muted">校验规则</h4>
            <ul className="mt-2.5 space-y-2">
              {field.rules.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <span className="mt-0.5 text-acid">▸</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <CodeBlock file="SKILL.md" code={field.example} note="示例摘自真实技能文件" />
            </div>
          </div>
        </Explorer>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="font-mono text-xs tracking-[0.15em] text-muted">
            一份真实的 frontmatter（skills/github/github-auth/SKILL.md）
          </h4>
          <div className="mt-3">
            <CodeBlock file="skills/github/github-auth/SKILL.md" code={SKILL_EXAMPLE_YAML} />
          </div>
        </div>
        <div>
          <h4 className="font-mono text-xs tracking-[0.15em] text-muted">
            正文规范：现代章节顺序（HARDLINE 第 5 条）
          </h4>
          <ul className="mt-3 space-y-2 rounded-lg border border-line bg-white p-5">
            {SKILL_BODY_SECTIONS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm text-ink/80">
                <span className="mt-0.5 text-ember">§</span>
                <span className="font-mono text-[13px]">{s}</span>
              </li>
            ))}
            <li className="pt-1 text-xs text-muted">
              复杂技能目标 ~200 行，简单技能 ~100 行；脚本进 scripts/、参考进 references/、模板进
              templates/。
            </li>
          </ul>
        </div>
      </div>

      <SectionHeading kicker="加载流程" title="从磁盘到斜杠命令：五步" />
      <div className="mt-6">
        <Stepper
          steps={SKILL_LOAD_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={selectStep}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
            STEP {idx + 1}/5 · {step.label}
          </p>
          <h3 className="mt-2 font-serif text-2xl">{step.title}</h3>
          <p className="mt-3 leading-relaxed text-ink/75">{step.body}</p>
          <div className="mt-5">
            <CodeBlock
              file={step.code.file}
              lines={step.code.lines}
              code={step.code.snippet}
              note={step.code.note}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">要点</p>
            <ul className="mt-3 space-y-2">
              {step.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <span className="mt-0.5 text-acid">▸</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => selectStep(SKILL_LOAD_STEPS[idx - 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              ‹ 上一步
            </button>
            <button
              type="button"
              disabled={idx === SKILL_LOAD_STEPS.length - 1}
              onClick={() => selectStep(SKILL_LOAD_STEPS[idx + 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              下一步 ›
            </button>
          </div>
        </div>
      </div>

      <SectionHeading kicker="记忆钩子" title="一句话记住技能格式" />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {SKILL_FORMAT_HOOK}
      </p>
    </section>
  );
}
