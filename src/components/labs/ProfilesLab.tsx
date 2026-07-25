'use client';

import { useState } from 'react';
import {
  EXTRA_RULES_NOTE,
  EXTRA_RULES_NOTE_EN,
  ISOLATION_MECHANISM,
  ISOLATION_MECHANISM_EN,
  ISOLATION_OWNED,
  ISOLATION_OWNED_EN,
  PROFILES_INTRO,
  PROFILES_INTRO_EN,
  PROFILES_UI,
  PROFILE_RULES,
  PROFILE_RULES_EN,
  RESOLVER_PROFILES,
  RESOLVER_RESOURCES,
  RESOLVER_RESOURCES_EN,
} from '@/data/profiles';
import { CodeBlock, Explorer, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { pick, useLang } from '@/lib/i18n';

// Chapter 17「Profiles 多实例」：隔离模型图 → GOOD vs BAD 规则卡 → 路径解析器。
export default function ProfilesLab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? PROFILES_INTRO_EN : PROFILES_INTRO;
  const isolationOwned = lang === 'en' ? ISOLATION_OWNED_EN : ISOLATION_OWNED;
  const isolationMechanism = lang === 'en' ? ISOLATION_MECHANISM_EN : ISOLATION_MECHANISM;
  const profileRules = lang === 'en' ? PROFILE_RULES_EN : PROFILE_RULES;
  const extraRulesNote = lang === 'en' ? EXTRA_RULES_NOTE_EN : EXTRA_RULES_NOTE;
  const resolverResources = lang === 'en' ? RESOLVER_RESOURCES_EN : RESOLVER_RESOURCES;
  const progress = useProgress();
  const saved = progress.labResults['lab:profiles'];
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};

  const [ruleId, setRuleId] = useState(typeof s.rule === 'string' ? s.rule : PROFILE_RULES[0].id);
  const [profileId, setProfileId] = useState(
    typeof s.profile === 'string' ? s.profile : RESOLVER_PROFILES[0].id,
  );

  const rule = profileRules.find((r) => r.id === ruleId) ?? profileRules[0];
  const profile = RESOLVER_PROFILES.find((p) => p.id === profileId) ?? RESOLVER_PROFILES[0];

  function save(next: { rule?: string; profile?: string }) {
    setLabResult('lab:profiles', { rule: ruleId, profile: profileId, ...next });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      {/* ── ① 隔离模型 ─────────────────────────────────────────── */}
      <SectionHeading
        kicker={pick(lang, PROFILES_UI.isolationKicker)}
        title={pick(lang, PROFILES_UI.isolationTitle)}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-mono text-sm font-medium text-ink">
            {pick(lang, PROFILES_UI.defaultInstance)}
          </p>
          <p className="mt-1 font-mono text-xs text-ember">~/.hermes</p>
          <ul className="mt-4 space-y-2">
            {isolationOwned.map((o) => (
              <li key={o.label} className="flex items-baseline gap-2.5 text-sm">
                <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-ink">
                  {o.label}
                </code>
                <span className="text-muted">{o.note}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-ink bg-ink p-5 text-white shadow-[inset_3px_0_0_0_var(--color-acid)]">
          <p className="font-mono text-sm font-medium text-acid">
            {pick(lang, PROFILES_UI.namedProfile)}
          </p>
          <p className="mt-1 font-mono text-xs text-ember">~/.hermes/profiles/&lt;name&gt;</p>
          <ul className="mt-4 space-y-2">
            {isolationOwned.map((o) => (
              <li key={o.label} className="flex items-baseline gap-2.5 text-sm">
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/85">
                  {o.label}
                </code>
                <span className="text-white/55">{o.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-white p-5">
        <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
          {pick(lang, PROFILES_UI.mechanismLabel)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-y-3">
          {isolationMechanism.map((m, i) => (
            <div key={m.id} className="flex items-center">
              {i > 0 && <span className="mx-2 font-mono text-muted">→</span>}
              <div className="rounded-lg border border-line bg-paper-deep px-4 py-2.5">
                <p className="font-mono text-sm font-medium text-ink">{m.label}</p>
                <p className="mt-0.5 max-w-xs text-xs leading-relaxed text-muted">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ② GOOD vs BAD ──────────────────────────────────────── */}
      <SectionHeading
        kicker={pick(lang, PROFILES_UI.rulesKicker)}
        title={pick(lang, PROFILES_UI.rulesTitle)}
      />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        {pick(lang, PROFILES_UI.rulesDesc)}
      </p>
      <div className="mt-6">
        <Explorer
          items={profileRules.map((r) => ({ id: r.id, name: r.title }))}
          current={rule.id}
          onChange={(id) => {
            setRuleId(id);
            save({ rule: id });
          }}
        >
          <div className="space-y-4">
            <p className="rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-ink/75">
              {rule.rule}
            </p>
            <CodeBlock file="hermes_constants.py · GOOD" code={rule.good.code} />
            <div className="rounded-lg border border-red/40 bg-red/5 p-1.5">
              <CodeBlock
                file={`${pick(lang, PROFILES_UI.badPrefix)} · ${rule.bad.label}`}
                code={rule.bad.code}
              />
            </div>
            <p className="rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-ink/75">
              {rule.note}
            </p>
          </div>
        </Explorer>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{extraRulesNote}</p>

      {/* ── ③ 路径解析器 ───────────────────────────────────────── */}
      <SectionHeading
        kicker={pick(lang, PROFILES_UI.resolverKicker)}
        title={pick(lang, PROFILES_UI.resolverTitle)}
      />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        {pick(lang, PROFILES_UI.resolverDesc)}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {RESOLVER_PROFILES.map((p) => {
          const active = p.id === profile.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProfileId(p.id);
                save({ profile: p.id });
              }}
              className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
                active
                  ? 'border-ink bg-ink text-acid'
                  : 'border-line bg-white text-ink/70 hover:border-muted'
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line bg-paper-deep px-4 py-2.5">
          <span className="font-mono text-[11px] tracking-[0.15em] text-muted">HERMES_HOME = </span>
          <code className="font-mono text-xs text-ember">{profile.home}</code>
        </div>
        {resolverResources.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-baseline gap-x-3 border-b border-line px-4 py-2.5 last:border-b-0"
          >
            <span className="w-16 shrink-0 text-sm font-medium">{r.label}</span>
            <code className="font-mono text-xs text-ink/80">
              {profile.home}/{r.suffix}
            </code>
            <span className="text-xs text-muted">{r.note}</span>
          </div>
        ))}
      </div>

      <p className="mt-10 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {pick(lang, PROFILES_UI.takeaway)}
      </p>
    </section>
  );
}
