'use client';

import { useState } from 'react';
import {
  CURATOR_HOOK,
  CURATOR_HOOK_EN,
  CURATOR_INTRO,
  CURATOR_INTRO_EN,
  CURATOR_IRON_RULES,
  CURATOR_IRON_RULES_EN,
  CURATOR_SIM_CONFIG,
  CURATOR_SIM_SKILLS,
  CURATOR_SIM_SKILLS_EN,
  CURATOR_STATES,
  CURATOR_STATES_EN,
  CURATOR_UI,
  CURATOR_USAGE_FIELDS,
  CURATOR_USAGE_FIELDS_EN,
  type CuratorSimSkill,
  type CuratorStateId,
} from '@/data/skills';
import { CodeBlock, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, pick, type Lang } from '@/lib/i18n';

// Chapter 06「技能系统（下）· 策展器」：策展器状态机可视化。
// 上：active → stale → archived 节点图（pinned 为正交豁免态），点击节点看逻辑与源码；
// 下：「触发一次策展检查」模拟，按 agent/curator.py 的自动流转规则判定一组样本技能。

type SimState = 'active' | 'stale' | 'archived';

interface Decision {
  after: SimState;
  reason: string;
  changed: boolean;
}

// 判定逻辑对齐 agent/curator.py 的自动状态流转：pinned / 非 agent 创建跳过 →
// 锚点 ≤ archive 线归档 → ≤ stale 线标 stale → 重新活跃的 stale 技能 reactivate →
// 从未使用且年幼的技能留宽限地板。
function judge(skill: CuratorSimSkill, lang: Lang): Decision {
  const { staleAfterDays, archiveAfterDays } = CURATOR_SIM_CONFIG;
  const anchor = skill.lastActivityDays;

  if (skill.createdBy !== 'agent') {
    return {
      after: skill.state,
      reason: pick(lang, CURATOR_UI.reasonNotAgent),
      changed: false,
    };
  }
  if (skill.pinned) {
    return { after: skill.state, reason: pick(lang, CURATOR_UI.reasonPinned), changed: false };
  }
  if (skill.useCount === 0 && anchor < staleAfterDays) {
    return {
      after: skill.state,
      reason: pick(lang, CURATOR_UI.reasonGrace)(anchor),
      changed: false,
    };
  }
  if (anchor >= archiveAfterDays) {
    return {
      after: 'archived',
      reason: pick(lang, CURATOR_UI.reasonArchive)(anchor, archiveAfterDays),
      changed: true, // 样本初始态仅 active|stale，归档必为变化
    };
  }
  if (anchor >= staleAfterDays) {
    if (skill.state === 'active') {
      return {
        after: 'stale',
        reason: pick(lang, CURATOR_UI.reasonMarkStale)(anchor, staleAfterDays),
        changed: true,
      };
    }
    return {
      after: 'stale',
      reason: pick(lang, CURATOR_UI.reasonStayStale)(anchor),
      changed: false,
    };
  }
  if (skill.state === 'stale') {
    return {
      after: 'active',
      reason: pick(lang, CURATOR_UI.reasonReactivate)(anchor),
      changed: true,
    };
  }
  return { after: 'active', reason: pick(lang, CURATOR_UI.reasonHealthy)(anchor), changed: false };
}

const STATE_STYLE: Record<CuratorStateId, { badge: string; dot: string }> = {
  active: { badge: 'border-green/40 bg-green/10 text-green', dot: 'text-green' },
  stale: { badge: 'border-ember/40 bg-ember/10 text-ember', dot: 'text-ember' },
  archived: { badge: 'border-red/40 bg-red/10 text-red', dot: 'text-red' },
  pinned: { badge: 'border-blue/40 bg-blue/10 text-blue', dot: 'text-blue' },
};

function StateBadge({ state }: { state: CuratorStateId }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[11px] ${STATE_STYLE[state].badge}`}
    >
      {state}
    </span>
  );
}

export default function SkillCuratorLab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? CURATOR_INTRO_EN : CURATOR_INTRO;
  const states = lang === 'en' ? CURATOR_STATES_EN : CURATOR_STATES;
  const usageFields = lang === 'en' ? CURATOR_USAGE_FIELDS_EN : CURATOR_USAGE_FIELDS;
  const ironRules = lang === 'en' ? CURATOR_IRON_RULES_EN : CURATOR_IRON_RULES;
  const simSkills = lang === 'en' ? CURATOR_SIM_SKILLS_EN : CURATOR_SIM_SKILLS;
  const hook = lang === 'en' ? CURATOR_HOOK_EN : CURATOR_HOOK;
  const progress = useProgress();
  const saved = progress.labResults['lab:skill-curator'];
  const savedNode =
    saved && typeof saved === 'object' && 'node' in saved && typeof saved.node === 'string'
      ? (saved.node as CuratorStateId)
      : 'active';
  const savedSim =
    saved && typeof saved === 'object' && 'sim' in saved && typeof saved.sim === 'boolean'
      ? saved.sim
      : false;
  const [nodeId, setNodeId] = useState<CuratorStateId>(savedNode);
  const [simRun, setSimRun] = useState(savedSim);

  const node = states.find((n) => n.id === nodeId) ?? states[0];
  const flowNodes = states.filter((n) => n.id !== 'pinned');
  const pinnedNode = states.find((n) => n.id === 'pinned') ?? states[0];
  const decisions = simSkills.map((s) => judge(s, lang));
  const changedCount = decisions.filter((d) => d.changed).length;

  function selectNode(id: CuratorStateId) {
    setNodeId(id);
    setLabResult('lab:skill-curator', { node: id, sim: simRun });
  }

  function runSim(run: boolean) {
    setSimRun(run);
    setLabResult('lab:skill-curator', { node: nodeId, sim: run });
  }

  function nodeButton(n: (typeof states)[number], dashed: boolean) {
    const active = n.id === node.id;
    return (
      <button
        key={n.id}
        type="button"
        onClick={() => selectNode(n.id)}
        className={`rounded-lg border px-5 py-3 text-left transition-colors ${
          dashed ? 'border-dashed' : ''
        } ${
          active
            ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-acid)]'
            : 'border-line bg-white hover:border-muted'
        }`}
      >
        <p className={`font-mono font-medium ${active ? 'text-acid' : STATE_STYLE[n.id].dot}`}>
          {n.name}
        </p>
        <p className={`mt-0.5 text-xs ${active ? 'text-white/60' : 'text-muted'}`}>{n.tagline}</p>
      </button>
    );
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <SectionHeading
        kicker={pick(lang, CURATOR_UI.stateKicker)}
        title={pick(lang, CURATOR_UI.stateTitle)}
      />

      {/* 节点图：flex + 箭头字符自绘，不引库 */}
      <div className="mt-6 rounded-lg border border-line bg-paper-deep p-5">
        <div className="flex flex-wrap items-stretch gap-x-3 gap-y-4">
          {flowNodes.map((n, i) => (
            <div key={n.id} className="flex items-center gap-3">
              {i > 0 && (
                <div className="flex flex-col items-center">
                  <span className="font-mono text-lg text-muted">→</span>
                  <span className="font-mono text-[10px] text-muted">
                    {i === 1
                      ? pick(lang, CURATOR_UI.daysIdle)(CURATOR_SIM_CONFIG.staleAfterDays)
                      : pick(lang, CURATOR_UI.daysIdle)(CURATOR_SIM_CONFIG.archiveAfterDays)}
                  </span>
                </div>
              )}
              {nodeButton(n, false)}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 pl-1">
          <span className="font-mono text-lg text-muted">↩</span>
          <span className="font-mono text-[10px] text-muted">
            {pick(lang, CURATOR_UI.reactivateNote)}
          </span>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 font-mono text-[11px] tracking-[0.15em] text-muted">
            {pick(lang, CURATOR_UI.exemptHeading)}
          </p>
          {nodeButton(pinnedNode, true)}
        </div>
      </div>

      {/* 选中节点详情 */}
      <div className="mt-4 rounded-lg border border-ink/20 bg-code-bg p-6 text-white md:p-8">
        <p className="font-mono text-[11px] tracking-[0.15em] text-acid">
          STATE · {node.id.toUpperCase()}
        </p>
        <h3 className="mt-2 font-serif text-2xl md:text-3xl">{node.name}</h3>
        <p className="mt-4 leading-relaxed text-white/75">{node.body}</p>
        <h4 className="mt-7 font-mono text-xs tracking-[0.15em] text-white/50">
          {pick(lang, CURATOR_UI.sourcesHeading)}
        </h4>
        <ul className="mt-2.5 space-y-2">
          {node.sources.map((s) => (
            <li key={s.path} className="text-sm">
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-ember">
                {s.path}
              </code>
              <span className="ml-2 text-white/65">{s.note}</span>
            </li>
          ))}
        </ul>
      </div>

      <SectionHeading
        kicker={pick(lang, CURATOR_UI.telemetryKicker)}
        title={pick(lang, CURATOR_UI.telemetryTitle)}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
            {pick(lang, CURATOR_UI.usageCaption)}
          </p>
          <ul className="mt-3 space-y-2">
            {usageFields.map((f) => (
              <li key={f.name} className="text-sm">
                <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-ember">
                  {f.name}
                </code>
                <span className="ml-2 text-ink/70">{f.note}</span>
              </li>
            ))}
          </ul>
        </div>
        <CodeBlock
          file="~/.hermes/skills/.usage.json"
          code={`{
  "weekly-review": {
    "use_count": 6,
    "view_count": 11,
    "patch_count": 2,
    "last_activity_at": 1750000000.0,
    "state": "active",
    "pinned": false,
    "created_by": "agent"
  }
}`}
          note={pick(lang, CURATOR_UI.usageNote)}
        />
      </div>

      <SectionHeading
        kicker={pick(lang, CURATOR_UI.simKicker)}
        title={pick(lang, CURATOR_UI.simTitle)}
      />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
        {pick(lang, CURATOR_UI.simDesc)(
          simSkills.length,
          CURATOR_SIM_CONFIG.staleAfterDays,
          CURATOR_SIM_CONFIG.archiveAfterDays,
          CURATOR_SIM_CONFIG.intervalHours / 24,
        )}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => runSim(true)}
          className="rounded-lg border border-ink bg-ink px-5 py-2.5 font-mono text-sm text-acid hover:opacity-90"
        >
          {pick(lang, CURATOR_UI.runButton)}
        </button>
        {simRun && (
          <>
            <button
              type="button"
              onClick={() => runSim(false)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink"
            >
              {pick(lang, CURATOR_UI.reset)}
            </button>
            <span className="font-mono text-xs text-muted">
              {pick(lang, CURATOR_UI.simSummary)(simSkills.length, changedCount)}
            </span>
          </>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] tracking-[0.1em] text-muted">
              <th className="px-4 py-2.5">{pick(lang, CURATOR_UI.thSkill)}</th>
              <th className="px-4 py-2.5">created_by</th>
              <th className="px-4 py-2.5">pinned</th>
              <th className="px-4 py-2.5">use_count</th>
              <th className="px-4 py-2.5">{pick(lang, CURATOR_UI.thLastActivity)}</th>
              <th className="px-4 py-2.5">{pick(lang, CURATOR_UI.thState)}</th>
              {simRun && <th className="px-4 py-2.5">{pick(lang, CURATOR_UI.thDecision)}</th>}
            </tr>
          </thead>
          <tbody>
            {simSkills.map((s, i) => {
              const d = decisions[i];
              return (
                <tr key={s.name} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <code className="font-mono text-[13px] text-ink">{s.name}</code>
                    {s.note && <span className="ml-1.5 text-xs text-muted">（{s.note}）</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.createdBy}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {s.pinned ? '📌 true' : 'false'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.useCount}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {pick(lang, CURATOR_UI.daysAgo)(s.lastActivityDays)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StateBadge state={s.state} />
                  </td>
                  {simRun && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <StateBadge state={d.after} />
                        {d.changed && (
                          <span className="font-mono text-xs text-ember">
                            {pick(lang, CURATOR_UI.transitioned)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{d.reason}</p>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionHeading
        kicker={pick(lang, CURATOR_UI.rulesKicker)}
        title={pick(lang, CURATOR_UI.rulesTitle)}
      />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {ironRules.map((r, i) => (
          <div key={r.title} className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
              {pick(lang, CURATOR_UI.ruleLabel)(i + 1)}
            </p>
            <h4 className="mt-2 font-medium">{r.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{r.body}</p>
          </div>
        ))}
      </div>

      <SectionHeading
        kicker={pick(lang, CURATOR_UI.hookKicker)}
        title={pick(lang, CURATOR_UI.hookTitle)}
      />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {hook}
      </p>
    </section>
  );
}
