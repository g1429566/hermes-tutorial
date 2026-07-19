'use client';

import { useState } from 'react';
import {
  CARD_ACTIONS,
  DISPATCHER_STEPS,
  INITIAL_CARDS,
  KANBAN_COLUMNS,
  KANBAN_INTRO,
  KANBAN_ISOLATION,
  KANBAN_VERBS,
  type KanbanCard,
  type KanbanColumn,
} from '@/data/kanban';
import { SectionHeading } from './primitives';

// Chapter 13「Kanban 工作队列」：Kanban 面板模拟 + dispatcher 循环 + 隔离模型。
// 卡片位置是会话内模拟状态，不持久化（刷新即重置演示）。
export default function KanbanLab() {
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_CARDS);

  function move(id: string, to: KanbanColumn) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, column: to } : c)));
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{KANBAN_INTRO}</p>

      <SectionHeading kicker="面板模拟" title="亲手移几张卡" />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.column === col.id);
          return (
            <div key={col.id} className="rounded-lg border border-line bg-paper-deep p-3">
              <div className="flex items-baseline justify-between px-1">
                <p className="font-mono text-xs font-bold tracking-wide text-ink">{col.name}</p>
                <span className="font-mono text-[11px] text-muted">{colCards.length}</span>
              </div>
              <p className="mt-0.5 px-1 text-[11px] text-muted">{col.desc}</p>
              <div className="mt-3 space-y-2">
                {colCards.map((card) => (
                  <div key={card.id} className="rounded-lg border border-line bg-white p-3">
                    <p className="font-mono text-[11px] text-muted">
                      {card.id} · @{card.assignee}
                    </p>
                    <p className="mt-1 text-sm leading-snug">{card.title}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {CARD_ACTIONS.filter((a) => a.from.includes(card.column)).map((a) => (
                        <button
                          key={a.action}
                          type="button"
                          title={a.tool}
                          onClick={() => move(card.id, a.to)}
                          className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                            a.to === 'blocked'
                              ? 'border-red/40 text-red hover:bg-red/5'
                              : a.to === 'done'
                                ? 'border-green/40 text-green hover:bg-green/5'
                                : 'border-line text-muted hover:border-ink hover:text-ink'
                          }`}
                        >
                          {a.action}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {colCards.length === 0 && (
                  <p className="rounded border border-dashed border-line p-3 text-center font-mono text-[11px] text-muted">
                    空
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-xs text-muted">
        你刚才的手动操作，对应 worker 真实调用的 kanban_* 工具（悬停按钮可见）。
      </p>

      <SectionHeading kicker="dispatcher" title="60 秒一拍的催熟循环" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DISPATCHER_STEPS.map((s, i) => (
          <div key={s.id} className="relative rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-[11px] text-ember">
              {i + 1} · {s.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{s.desc}</p>
          </div>
        ))}
      </div>

      <SectionHeading kicker="隔离模型" title="多 agent 不打架的四个机制" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {KANBAN_ISOLATION.map((iso) => (
          <div key={iso.title} className="rounded-lg border border-line bg-white p-4">
            <p className="font-medium">{iso.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{iso.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-3xl rounded-lg border border-acid bg-acid/10 p-4 font-mono text-sm leading-relaxed">
        入口：用户侧 hermes kanban &lt;{KANBAN_VERBS.join(' | ')}&gt;；worker 侧 kanban_* toolset
        （不在 kanban 任务里时 schema 占用为零）。
      </p>
    </section>
  );
}
