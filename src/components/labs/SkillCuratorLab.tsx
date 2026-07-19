'use client';

import { useState } from 'react';
import {
  CURATOR_HOOK,
  CURATOR_INTRO,
  CURATOR_IRON_RULES,
  CURATOR_SIM_CONFIG,
  CURATOR_SIM_SKILLS,
  CURATOR_STATES,
  CURATOR_USAGE_FIELDS,
  type CuratorSimSkill,
  type CuratorStateId,
} from '@/data/skills';
import { CodeBlock, SectionHeading } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

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
function judge(skill: CuratorSimSkill): Decision {
  const { staleAfterDays, archiveAfterDays } = CURATOR_SIM_CONFIG;
  const anchor = skill.lastActivityDays;

  if (skill.createdBy !== 'agent') {
    return {
      after: skill.state,
      reason: 'created_by ≠ "agent"——bundled / 用户技能策展器无权触碰',
      changed: false,
    };
  }
  if (skill.pinned) {
    return { after: skill.state, reason: 'pinned——跳过一切自动流转与 LLM 评审', changed: false };
  }
  if (skill.useCount === 0 && anchor < staleAfterDays) {
    return {
      after: skill.state,
      reason: `从未使用且创建仅 ${anchor} 天——宽限地板：没有使用证据 ≠ 该归档`,
      changed: false,
    };
  }
  if (anchor >= archiveAfterDays) {
    return {
      after: 'archived',
      reason: `${anchor} 天无活动 ≥ archive_after_days（${archiveAfterDays}）——归档到 .archive/（可恢复）`,
      changed: true, // 样本初始态仅 active|stale，归档必为变化
    };
  }
  if (anchor >= staleAfterDays) {
    if (skill.state === 'active') {
      return {
        after: 'stale',
        reason: `${anchor} 天无活动 ≥ stale_after_days（${staleAfterDays}）——标记 stale`,
        changed: true,
      };
    }
    return { after: 'stale', reason: `${anchor} 天无活动——维持 stale，等待归档线`, changed: false };
  }
  if (skill.state === 'stale') {
    return {
      after: 'active',
      reason: `最近活动仅 ${anchor} 天前，新于 stale 线——reactivate 回 active`,
      changed: true,
    };
  }
  return { after: 'active', reason: `最近活动仅 ${anchor} 天前——保持健康`, changed: false };
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

  const node = CURATOR_STATES.find((n) => n.id === nodeId) ?? CURATOR_STATES[0];
  const flowNodes = CURATOR_STATES.filter((n) => n.id !== 'pinned');
  const pinnedNode = CURATOR_STATES.find((n) => n.id === 'pinned') ?? CURATOR_STATES[0];
  const decisions = CURATOR_SIM_SKILLS.map((s) => judge(s));
  const changedCount = decisions.filter((d) => d.changed).length;

  function selectNode(id: CuratorStateId) {
    setNodeId(id);
    setLabResult('lab:skill-curator', { node: id, sim: simRun });
  }

  function runSim(run: boolean) {
    setSimRun(run);
    setLabResult('lab:skill-curator', { node: nodeId, sim: run });
  }

  function nodeButton(n: (typeof CURATOR_STATES)[number], dashed: boolean) {
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
      <p className="max-w-3xl leading-relaxed text-ink/75">{CURATOR_INTRO}</p>

      <SectionHeading kicker="状态机" title="active → stale → archived（pinned 豁免）" />

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
                      ? `${CURATOR_SIM_CONFIG.staleAfterDays} 天无活动`
                      : `${CURATOR_SIM_CONFIG.archiveAfterDays} 天无活动`}
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
            stale 期间重新使用 → reactivate 回 active
          </span>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 font-mono text-[11px] tracking-[0.15em] text-muted">
            豁免态（与 state 正交的布尔标记，不是第四个状态）
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
        <h4 className="mt-7 font-mono text-xs tracking-[0.15em] text-white/50">源码位置</h4>
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

      <SectionHeading kicker="遥测" title=".usage.json：策展器的眼睛" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
            ~/.hermes/skills/.usage.json · 每技能一条记录（tools/skill_usage.py）
          </p>
          <ul className="mt-3 space-y-2">
            {CURATOR_USAGE_FIELDS.map((f) => (
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
          note='state 取值 active / stale / archived；created_by == "agent" 才会被策展'
        />
      </div>

      <SectionHeading kicker="模拟" title="触发一次策展检查" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
        按下按钮，对下面 7 个样本技能跑一轮自动流转判定（规则与 agent/curator.py
        一致；配置取默认值： stale_after_days={CURATOR_SIM_CONFIG.staleAfterDays}
        、archive_after_days=
        {CURATOR_SIM_CONFIG.archiveAfterDays}、每 {CURATOR_SIM_CONFIG.intervalHours / 24} 天一轮）。
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => runSim(true)}
          className="rounded-lg border border-ink bg-ink px-5 py-2.5 font-mono text-sm text-acid hover:opacity-90"
        >
          ▶ 触发一次策展检查
        </button>
        {simRun && (
          <>
            <button
              type="button"
              onClick={() => runSim(false)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink"
            >
              重置
            </button>
            <span className="font-mono text-xs text-muted">
              检查 {CURATOR_SIM_SKILLS.length} 个技能 · {changedCount} 个发生流转
            </span>
          </>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] tracking-[0.1em] text-muted">
              <th className="px-4 py-2.5">技能</th>
              <th className="px-4 py-2.5">created_by</th>
              <th className="px-4 py-2.5">pinned</th>
              <th className="px-4 py-2.5">use_count</th>
              <th className="px-4 py-2.5">最近活动</th>
              <th className="px-4 py-2.5">当前状态</th>
              {simRun && <th className="px-4 py-2.5">判定结果</th>}
            </tr>
          </thead>
          <tbody>
            {CURATOR_SIM_SKILLS.map((s, i) => {
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
                  <td className="px-4 py-2.5 font-mono text-xs">{s.lastActivityDays} 天前</td>
                  <td className="px-4 py-2.5">
                    <StateBadge state={s.state} />
                  </td>
                  {simRun && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <StateBadge state={d.after} />
                        {d.changed && <span className="font-mono text-xs text-ember">← 流转</span>}
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

      <SectionHeading kicker="铁律" title="curator 永远不做这三件事" />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {CURATOR_IRON_RULES.map((r, i) => (
          <div key={r.title} className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-ember">铁律 {i + 1}</p>
            <h4 className="mt-2 font-medium">{r.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{r.body}</p>
          </div>
        ))}
      </div>

      <SectionHeading kicker="记忆钩子" title="一句话记住策展器" />
      <p className="mt-3 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        {CURATOR_HOOK}
      </p>
    </section>
  );
}
