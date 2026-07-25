'use client';

import { useState } from 'react';
import {
  CARD_ACTIONS,
  CARD_ACTIONS_EN,
  DISPATCHER_STEPS,
  DISPATCHER_STEPS_EN,
  INITIAL_CARDS,
  INITIAL_CARDS_EN,
  KANBAN_COLUMNS,
  KANBAN_COLUMNS_EN,
  KANBAN_INTRO,
  KANBAN_INTRO_EN,
  KANBAN_ISOLATION,
  KANBAN_ISOLATION_EN,
  KANBAN_LAB_UI,
  KANBAN_VERBS,
  type KanbanCard,
  type KanbanColumn,
} from '@/data/kanban';
import { SectionHeading } from './primitives';
import { pick, useLang } from '@/lib/i18n';

// Chapter 13「Kanban 工作队列」：Kanban 面板模拟 + dispatcher 循环 + 隔离模型。
// 卡片位置是会话内模拟状态，不持久化（刷新即重置演示）。
export default function KanbanLab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? KANBAN_INTRO_EN : KANBAN_INTRO;
  const columns = lang === 'en' ? KANBAN_COLUMNS_EN : KANBAN_COLUMNS;
  const cardActions = lang === 'en' ? CARD_ACTIONS_EN : CARD_ACTIONS;
  const dispatcherSteps = lang === 'en' ? DISPATCHER_STEPS_EN : DISPATCHER_STEPS;
  const isolation = lang === 'en' ? KANBAN_ISOLATION_EN : KANBAN_ISOLATION;
  // 标题按当前语言从初始数据集取，state 只承载列位置——切换语言时标题随之切换。
  const initialCards = lang === 'en' ? INITIAL_CARDS_EN : INITIAL_CARDS;
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_CARDS);

  function move(id: string, to: KanbanColumn) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, column: to } : c)));
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      <SectionHeading
        kicker={pick(lang, KANBAN_LAB_UI.boardKicker)}
        title={pick(lang, KANBAN_LAB_UI.boardTitle)}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
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
                    <p className="mt-1 text-sm leading-snug">
                      {initialCards.find((c) => c.id === card.id)?.title ?? card.title}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {cardActions
                        .filter((a) => a.from.includes(card.column))
                        .map((a) => (
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
                    {pick(lang, KANBAN_LAB_UI.emptyColumn)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-xs text-muted">{pick(lang, KANBAN_LAB_UI.boardHint)}</p>

      <SectionHeading
        kicker={pick(lang, KANBAN_LAB_UI.dispatcherKicker)}
        title={pick(lang, KANBAN_LAB_UI.dispatcherTitle)}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dispatcherSteps.map((s, i) => (
          <div key={s.id} className="relative rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-[11px] text-ember">
              {i + 1} · {s.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{s.desc}</p>
          </div>
        ))}
      </div>

      <SectionHeading
        kicker={pick(lang, KANBAN_LAB_UI.isolationKicker)}
        title={pick(lang, KANBAN_LAB_UI.isolationTitle)}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {isolation.map((iso) => (
          <div key={iso.title} className="rounded-lg border border-line bg-white p-4">
            <p className="font-medium">{iso.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{iso.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-3xl rounded-lg border border-acid bg-acid/10 p-4 font-mono text-sm leading-relaxed">
        {pick(lang, KANBAN_LAB_UI.footerNote)(KANBAN_VERBS.join(' | '))}
      </p>
    </section>
  );
}
