'use client';

import { useState } from 'react';
import {
  DEFAULT_SKILL_FORM,
  PLATFORMS,
  SKILL_BUILDER_INTRO,
  SKILL_BUILDER_INTRO_EN,
  SKILL_BUILDER_UI,
  SKILL_CATEGORIES,
  SKILL_DIR_ENTRIES,
  SKILL_DIR_ENTRIES_EN,
  SKILL_SECTION_ORDER,
  SKILL_SECTION_ORDER_EN,
  buildSkillMarkdown,
  skillFilePath,
  type SkillBuilderForm,
} from '@/data/skill-builder';
import { DESCRIPTION_MAX_LENGTH, validateSkill } from '@/lib/skill-validate';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick } from '@/lib/i18n';
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
  const { lang } = useLang();
  const intro = lang === 'en' ? SKILL_BUILDER_INTRO_EN : SKILL_BUILDER_INTRO;
  const dirEntries = lang === 'en' ? SKILL_DIR_ENTRIES_EN : SKILL_DIR_ENTRIES;
  const sectionOrder = lang === 'en' ? SKILL_SECTION_ORDER_EN : SKILL_SECTION_ORDER;
  const progress = useProgress();
  const [form, setForm] = useState<SkillBuilderForm>(() =>
    restoreForm(progress.labResults[LAB_KEY]),
  );

  const errors = validateSkill(form, lang);
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
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

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
              {pick(lang, SKILL_BUILDER_UI.descLabel).replace(
                '{MAX}',
                String(DESCRIPTION_MAX_LENGTH),
              )}
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
              {pick(lang, SKILL_BUILDER_UI.authorLabel)}
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
            <p className={labelCls}>{pick(lang, SKILL_BUILDER_UI.platformsLabel)}</p>
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
              {pick(lang, SKILL_BUILDER_UI.platformsNote)}
            </p>
          </div>
        </div>

        {/* ── 右：实时预览 + 校验 ── */}
        <div className="space-y-4">
          <CodeBlock
            file={skillFilePath(form)}
            code={buildSkillMarkdown(form)}
            note={pick(lang, SKILL_BUILDER_UI.previewNote)}
          />
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
              {pick(lang, SKILL_BUILDER_UI.validationTitle)}
            </p>
            {errors.length === 0 ? (
              <p className="mt-3 text-sm text-green">
                {pick(lang, SKILL_BUILDER_UI.validationPass)}
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

      <SectionHeading
        kicker={pick(lang, SKILL_BUILDER_UI.dirKicker)}
        title={pick(lang, SKILL_BUILDER_UI.dirTitle)}
      />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        {pick(lang, SKILL_BUILDER_UI.dirBody)}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {dirEntries.map((e) => (
          <div key={e.file} className="rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-sm text-ember">
              {form.name.trim() || 'my-skill'}/{e.file}
            </p>
            <p className="mt-1 text-sm text-ink/70">{e.desc}</p>
          </div>
        ))}
      </div>

      <SectionHeading
        kicker={pick(lang, SKILL_BUILDER_UI.sectionsKicker)}
        title={pick(lang, SKILL_BUILDER_UI.sectionsTitle)}
      />
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">
        {pick(lang, SKILL_BUILDER_UI.sectionsBody)}
      </p>
      <ol className="mt-5 max-w-3xl space-y-2">
        {sectionOrder.map((s, i) => (
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

      <SectionHeading
        kicker={pick(lang, SKILL_BUILDER_UI.hookKicker)}
        title={pick(lang, SKILL_BUILDER_UI.hookTitle)}
      />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {pick(lang, SKILL_BUILDER_UI.hookBody)}
      </p>
    </section>
  );
}
