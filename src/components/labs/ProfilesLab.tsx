'use client';

import { useState } from 'react';
import {
  EXTRA_RULES_NOTE,
  ISOLATION_MECHANISM,
  ISOLATION_OWNED,
  PROFILES_INTRO,
  PROFILE_RULES,
  RESOLVER_PROFILES,
  RESOLVER_RESOURCES,
} from '@/data/profiles';
import { CodeBlock, Explorer, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 17「Profiles 多实例」：隔离模型图 → GOOD vs BAD 规则卡 → 路径解析器。
export default function ProfilesLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:profiles'];
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};

  const [ruleId, setRuleId] = useState(typeof s.rule === 'string' ? s.rule : PROFILE_RULES[0].id);
  const [profileId, setProfileId] = useState(
    typeof s.profile === 'string' ? s.profile : RESOLVER_PROFILES[0].id,
  );

  const rule = PROFILE_RULES.find((r) => r.id === ruleId) ?? PROFILE_RULES[0];
  const profile = RESOLVER_PROFILES.find((p) => p.id === profileId) ?? RESOLVER_PROFILES[0];

  function save(next: { rule?: string; profile?: string }) {
    setLabResult('lab:profiles', { rule: ruleId, profile: profileId, ...next });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{PROFILES_INTRO}</p>

      {/* ── ① 隔离模型 ─────────────────────────────────────────── */}
      <SectionHeading kicker="隔离模型" title="两个实例，两套完整家当" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-mono text-sm font-medium text-ink">默认实例</p>
          <p className="mt-1 font-mono text-xs text-ember">~/.hermes</p>
          <ul className="mt-4 space-y-2">
            {ISOLATION_OWNED.map((o) => (
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
          <p className="font-mono text-sm font-medium text-acid">命名 profile</p>
          <p className="mt-1 font-mono text-xs text-ember">~/.hermes/profiles/&lt;name&gt;</p>
          <ul className="mt-4 space-y-2">
            {ISOLATION_OWNED.map((o) => (
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
        <p className="font-mono text-[11px] tracking-[0.15em] text-muted">核心机制</p>
        <div className="mt-4 flex flex-wrap items-center gap-y-3">
          {ISOLATION_MECHANISM.map((m, i) => (
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
      <SectionHeading kicker="profile-safe 规则" title="GOOD vs BAD 代码对照" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        AGENTS.md 给贡献者立了 6 条 profile-safe 规则。点击左侧规则，看右侧代码对照。
      </p>
      <div className="mt-6">
        <Explorer
          items={PROFILE_RULES.map((r) => ({ id: r.id, name: r.title }))}
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
              <CodeBlock file={`反例 · ${rule.bad.label}`} code={rule.bad.code} />
            </div>
            <p className="rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-ink/75">
              {rule.note}
            </p>
          </div>
        </Explorer>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{EXTRA_RULES_NOTE}</p>

      {/* ── ③ 路径解析器 ───────────────────────────────────────── */}
      <SectionHeading kicker="动手试试" title="路径解析器" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        选择一个 profile，看每类资源实际解析到哪个路径。
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
        {RESOLVER_RESOURCES.map((r) => (
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
        一句话记住 profiles：_apply_profile_override() 抢在任何 import 之前设置
        HERMES_HOME——之后每个 get_hermes_home() 都自动落在当前 profile 的目录里。
      </p>
    </section>
  );
}
