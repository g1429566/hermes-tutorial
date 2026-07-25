'use client';

import { useEffect, useState } from 'react';
import { HERO, HERO_EN, TERMINAL_LINES, TERMINAL_LINES_EN, type TerminalLineKind } from '@/data/hero';
import { useLang } from '@/lib/i18n';

interface HeroChapterProps {
  onNavigate: (id: string) => void;
}

const KIND_STYLE: Record<TerminalLineKind, string> = {
  cmd: 'text-white',
  agent: 'text-white/85',
  tool: 'text-acid',
  ok: 'text-ember',
  out: 'text-white/50',
};

const KIND_PREFIX: Record<TerminalLineKind, string> = {
  cmd: '$ ',
  agent: '⏺ ',
  tool: '  ',
  ok: '',
  out: '',
};

// Chapter 00「先建立直觉」：全屏暗色 Hero + 终端动画 + CTA。
export default function HeroChapter({ onNavigate }: HeroChapterProps) {
  const { lang } = useLang();
  const hero = lang === 'en' ? HERO_EN : HERO;
  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <div className="chapter flex flex-1 flex-col justify-center">
        <p className="kicker !text-acid">{hero.kicker}</p>
        <h1 className="mt-6 font-serif text-[clamp(56px,8.5vw,128px)] leading-[1.02] tracking-tight">
          {hero.title}
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/70">{hero.subtitle}</p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <ul className="space-y-4">
            {hero.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/85">
                <span className="mt-1 font-mono text-acid">▸</span>
                <span>{p}</span>
              </li>
            ))}
            <li className="pt-4">
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="rounded bg-acid px-6 py-3 font-mono text-sm font-bold text-ink transition-transform hover:-translate-y-0.5"
              >
                {hero.cta}
              </button>
            </li>
          </ul>
          <HeroTerminal />
        </div>
      </div>
    </div>
  );
}

// 终端动画：cmd 行逐字打出，其余行整行出现，播完停顿后循环。
function HeroTerminal() {
  const { lang } = useLang();
  const lines = lang === 'en' ? TERMINAL_LINES_EN : TERMINAL_LINES;
  const [lineIdx, setLineIdx] = useState(0); // 下一条要显示的行
  const [typed, setTyped] = useState(0); // 当前 cmd 行已打出的字符数

  useEffect(() => {
    if (lineIdx >= lines.length) {
      const restart = setTimeout(() => {
        setLineIdx(0);
        setTyped(0);
      }, 5000);
      return () => clearTimeout(restart);
    }
    const line = lines[lineIdx];
    if (line.kind === 'cmd' && typed < line.text.length) {
      const t = setTimeout(() => setTyped((v) => v + 1), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        setLineIdx((v) => v + 1);
        setTyped(0);
      },
      line.kind === 'cmd' ? 600 : 750,
    );
    return () => clearTimeout(t);
  }, [lineIdx, typed, lines]);

  const visible: { kind: TerminalLineKind; text: string; partial: boolean }[] = [];
  for (let i = 0; i < lineIdx && i < lines.length; i++) {
    visible.push({ ...lines[i], partial: false });
  }
  if (lineIdx < lines.length) {
    const line = lines[lineIdx];
    visible.push({
      ...line,
      text: line.kind === 'cmd' ? line.text.slice(0, typed) : line.text,
      partial: true,
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/15 bg-code-bg shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-ember/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-green/80" />
        <span className="ml-3 font-mono text-[11px] text-white/40">zsh — hermes</span>
      </div>
      <div className="min-h-[320px] p-5 font-mono text-[13px] leading-7">
        {visible.map((l, i) => (
          <p key={i} className={KIND_STYLE[l.kind]}>
            <span className="text-white/40">{KIND_PREFIX[l.kind]}</span>
            {l.text}
            {l.partial && <span className="ht-cursor text-acid">▋</span>}
          </p>
        ))}
      </div>
    </div>
  );
}
