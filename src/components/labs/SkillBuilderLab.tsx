'use client';

import { useState } from 'react';
import {
  DEFAULT_SKILL_FORM,
  PLATFORMS,
  SKILL_BUILDER_INTRO,
  SKILL_CATEGORIES,
  SKILL_DIR_ENTRIES,
  SKILL_SECTION_ORDER,
  buildSkillMarkdown,
  skillFilePath,
  type SkillBuilderForm,
} from '@/data/skill-builder';
import { DESCRIPTION_MAX_LENGTH, validateSkill } from '@/lib/skill-validate';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { CodeBlock, SectionHeading } from './primitives';

const LAB_KEY = 'lab:skill-builder';

// 从 labResults 恢复快照；任何字段形状不对就回退到默认值。
function restoreForm(saved: unknown): SkillBuilderForm {
  if (!saved || typeof saved !== 'object') return DEFAULT_SKILL_FORM;
  const s = saved as Record<string, unknown>;
  return {
    name: typeof s.name === 'string' ? s.name : DEFAULT_SKILL_FORM.name,
    description: typeof s.description === 'string' ? s.description : DEFAULT_SKILL_FORM.description,
    version: typeof s.version === 'string' ? s.version : DEFAULT_SKILL_FORM.version,
    author: typeof s.author === 'string' ? s.author : DEFAULT_SKILL_FORM.author,
    platforms: Array.isArray(s.platforms)
      ? s.platforms.filter((p): p is string => typeof p === 'string')
      : DEFAULT_SKILL_FORM.platforms,
    category:
      typeof s.category === 'string' && SKILL_CATEGORIES.includes(s.category)
        ? s.category
        : DEFAULT_SKILL_FORM.category,
  };
}

const labelCls = 'block font-mono text-[11px] tracking-[0.15em] text-muted';
const inputCls =
  'mt-1.5 w-full rounded border bg-white px-3 py-2 font-mono text-sm text-ink placeholder:text-muted/60 focus:outline-none';

// Chapter 18「写一个新技能」：技能构建器。
// 左：frontmatter 表单；右：实时 SKILL.md 预览 + 硬标准校验；下方：目录结构与章节顺序。
export default function SkillBuilderLab() {
  const progress = useProgress();
  const [form, setForm] = useState<SkillBuilderForm>(() =>
    restoreForm(progress.labResults[LAB_KEY]),
  );

  const errors = validateSkill(form);
  const broken: Set<string> = new Set(errors.map((e) => e.field));

  function update(next: SkillBuilderForm) {
    setForm(next);
    setLabResult(LAB_KEY, next);
  }

  function togglePlatform(p: string) {
    const platforms = form.platforms.includes(p)
      ? form.platforms.filter((x) => x !== p)
      : [...form.platforms, p];
    update({ ...form, platforms });
  }

  function border(field: string): string {
    return broken.has(field) ? 'border-red' : 'border-line focus:border-ink';
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{SKILL_BUILDER_INTRO}</p>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {/* ── 左：frontmatter 表单 ── */}
        <div className="space-y-5 rounded-lg border border-line bg-paper-deep p-6">
          <div>
            <label className={labelCls} htmlFor="sb-name">
              name · kebab-case
            </label>
            <input
              id="sb-name"
              className={`${inputCls} ${border('name')}`}
              value={form.name}
              onChange={(e) => update({ ...form, name: e.target.value })}
              placeholder="arxiv-digest"
              spellCheck={false}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="sb-desc">
              description · 一句话，≤{DESCRIPTION_MAX_LENGTH} 字符，句号结尾
            </label>
            <textarea
              id="sb-desc"
              className={`${inputCls} resize-none ${border('description')}`}
              rows={2}
              value={form.description}
              onChange={(e) => update({ ...form, description: e.target.value })}
              placeholder="Fetch and summarize new arXiv papers by topic."
              spellCheck={false}
            />
            <p
              className={`mt-1 text-right font-mono text-[11px] ${
                form.description.trim().length > DESCRIPTION_MAX_LENGTH ? 'text-red' : 'text-muted'
              }`}
            >
              {form.description.trim().length}/{DESCRIPTION_MAX_LENGTH}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="sb-version">
                version · x.y.z
              </label>
              <input
                id="sb-version"
                className={`${inputCls} ${border('version')}`}
                value={form.version}
                onChange={(e) => update({ ...form, version: e.target.value })}
                placeholder="0.1.0"
                spellCheck={false}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="sb-category">
                category
              </label>
              <select
                id="sb-category"
                className={`${inputCls} border-line focus:border-ink`}
                value={form.category}
                onChange={(e) => update({ ...form, category: e.target.value })}
              >
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="sb-author">
              author · 人类贡献者在前（硬标准第 4 条）
            </label>
            <input
              id="sb-author"
              className={`${inputCls} border-line focus:border-ink`}
              value={form.author}
              onChange={(e) => update({ ...form, author: e.target.value })}
              placeholder="Your Name <@your-github>"
              spellCheck={false}
            />
          </div>

          <div>
            <p className={labelCls}>platforms · OS 门控（硬标准第 3 条）</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = form.platforms.includes(p);
                return (
                  <label
                    key={p}
                    className={`cursor-pointer rounded border px-3 py-2 font-mono text-sm transition-colors ${
                      on
                        ? 'border-ink bg-ink text-acid'
                        : `${broken.has('platforms') ? 'border-red' : 'border-line'} bg-white text-ink/70 hover:border-muted`
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => togglePlatform(p)}
                    />
                    {p}
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              全不选 = 不声明门控；脚本里用了 fcntl / osascript / systemctl
              这类平台绑定原语时才收窄。
            </p>
          </div>
        </div>

        {/* ── 右：实时预览 + 校验 ── */}
        <div className="space-y-4">
          <CodeBlock
            file={skillFilePath(form)}
            code={buildSkillMarkdown(form)}
            note="实时生成的 YAML frontmatter——与仓库里真实技能同一形状"
          />
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
              硬标准校验（AGENTS.md 第 1、3 条）
            </p>
            {errors.length === 0 ? (
              <p className="mt-3 text-sm text-green">
                ✓ 全部通过——这个 frontmatter 过了 reviewer 的第一关
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {errors.map((e, i) => (
                  <li key={`${e.field}-${i}`} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 text-red">✗</span>
                    <span className="text-ink/80">
                      <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-red">
                        {e.field}
                      </code>
                      <span className="ml-2">{e.message}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <SectionHeading kicker="目录约定" title="一个技能就是一个目录" />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        硬标准第 6 条：脚本进 <code className="font-mono text-ember">scripts/</code>、参考进{' '}
        <code className="font-mono text-ember">references/</code>、模板进{' '}
        <code className="font-mono text-ember">templates/</code>
        ——别指望模型每次调用都现场重写解析逻辑，把帮手随技能一起发布，正文里用相对路径引用。
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {SKILL_DIR_ENTRIES.map((e) => (
          <div key={e.file} className="rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-sm text-ember">
              {form.name.trim() || 'my-skill'}/{e.file}
            </p>
            <p className="mt-1 text-sm text-ink/70">{e.desc}</p>
          </div>
        ))}
      </div>

      <SectionHeading kicker="正文结构" title="现代章节顺序（硬标准第 5 条）" />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        复杂技能目标约 200 行、简单技能约 100 行；砍掉营销式引言和在 Prerequisites
        里已经讲过的环境变量复读。
      </p>
      <ol className="mt-5 max-w-3xl space-y-2">
        {SKILL_SECTION_ORDER.map((s, i) => (
          <li
            key={s.name}
            className="flex items-baseline gap-4 rounded-lg border border-line bg-white px-4 py-3"
          >
            <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p className="font-mono text-sm text-ink">{s.name}</p>
              <p className="mt-0.5 text-xs text-muted">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <SectionHeading kicker="记忆钩子" title="一句话记住技能 frontmatter" />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        60 字符、一句话、句号结尾、没有营销词、不重复技能名——description 是技能的脸，
        也是模型注意力的税。
      </p>
    </section>
  );
}
