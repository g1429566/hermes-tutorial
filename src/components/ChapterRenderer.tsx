'use client';

import type { ComponentType } from 'react';
import {
  CHAPTER_BY_ID,
  nextChapter,
  prevChapter,
  MODULES,
  MODULES_EN,
  chapterText,
  type Chapter,
} from '@/data/chapters';
import { markChapterComplete, setChapterStatus } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { useLang, type Lang } from '@/lib/i18n';
import { t } from '@/data/ui-strings';
import HeroChapter from './labs/HeroChapter';
import ArchitectureLab from './labs/ArchitectureLab';
import FeatureMatrixLab from './labs/FeatureMatrixLab';
import InstallLab from './labs/InstallLab';
import AgentLoopLab from './labs/AgentLoopLab';
import SkillFormatLab from './labs/SkillFormatLab';
import SkillCuratorLab from './labs/SkillCuratorLab';
import ToolRoutingLab from './labs/ToolRoutingLab';
import MemoryLab from './labs/MemoryLab';
import DelegationLab from './labs/DelegationLab';
import GatewayLab from './labs/GatewayLab';
import GatewayFlowLab from './labs/GatewayFlowLab';
import CronLab from './labs/CronLab';
import KanbanLab from './labs/KanbanLab';
import TUILab from './labs/TUILab';
import CliLab from './labs/CliLab';
import BackendsLab from './labs/BackendsLab';
import ProfilesLab from './labs/ProfilesLab';
import SkillBuilderLab from './labs/SkillBuilderLab';
import ToolBuilderLab from './labs/ToolBuilderLab';
import ProviderLab from './labs/ProviderLab';
import PluginBuilderLab from './labs/PluginBuilderLab';
import AgentDesignLab from './labs/AgentDesignLab';
import InterviewLab from './labs/InterviewLab';
import TopologyLab from './labs/TopologyLab';
import DesignDocLab from './labs/DesignDocLab';
import SelfAssessmentLab from './labs/SelfAssessmentLab';
import ReliabilityLab from './labs/ReliabilityLab';
import InteropLab from './labs/InteropLab';
import CompressionLab from './labs/CompressionLab';
import RoutingLab from './labs/RoutingLab';
import MultimodalLab from './labs/MultimodalLab';
import EvaluationLab from './labs/EvaluationLab';

interface ChapterRendererProps {
  chapterId: string;
  onNavigate: (id: string) => void;
}

// 章节 → 实验室组件注册表（28 章全部就位；start 走 HeroChapter 特例）。
const LAB_COMPONENTS: Record<string, ComponentType> = {
  // M0
  map: ArchitectureLab,
  features: FeatureMatrixLab,
  install: InstallLab,
  // M1
  'agent-loop': AgentLoopLab,
  'skills-1': SkillFormatLab,
  'skills-2': SkillCuratorLab,
  tools: ToolRoutingLab,
  memory: MemoryLab,
  delegation: DelegationLab,
  'gateway-1': GatewayLab,
  'gateway-2': GatewayFlowLab,
  cron: CronLab,
  kanban: KanbanLab,
  tui: TUILab,
  cli: CliLab,
  backends: BackendsLab,
  profiles: ProfilesLab,
  // M2
  'build-skill': SkillBuilderLab,
  'build-tool': ToolBuilderLab,
  'build-provider': ProviderLab,
  'build-plugin': PluginBuilderLab,
  'design-agent': AgentDesignLab,
  // M3
  'interview-loop': InterviewLab,
  'interview-multi': TopologyLab,
  'interview-design': DesignDocLab,
  'interview-checklist': SelfAssessmentLab,
  // M4
  reliability: ReliabilityLab,
  interop: InteropLab,
  // M5
  compression: CompressionLab,
  routing: RoutingLab,
  multimodal: MultimodalLab,
  evaluation: EvaluationLab,
};

// 每章 = kicker + 讲解 + 交互实验室 + 要点 + 完成按钮。
// 阶段 1 仅 M0 四章有完整内容，其余章节渲染建设占位。
export default function ChapterRenderer({ chapterId, onNavigate }: ChapterRendererProps) {
  const { lang } = useLang();
  const chapter = CHAPTER_BY_ID.get(chapterId);
  if (!chapter) return null;

  // Chapter 00 是全屏 Hero，自带布局，不走标准章节框架
  if (chapterId === 'start') return <HeroChapter onNavigate={onNavigate} />;

  return (
    <article className="chapter">
      <ChapterHeader chapter={chapter} lang={lang} />
      <ChapterBody chapterId={chapterId} chapter={chapter} lang={lang} />
      <ChapterFooter chapter={chapter} onNavigate={onNavigate} lang={lang} />
    </article>
  );
}

function ChapterHeader({ chapter, lang }: { chapter: Chapter; lang: Lang }) {
  const text = chapterText(chapter, lang);
  return (
    <header className="max-w-3xl">
      <p className="kicker">
        {MODULES[chapter.module].label} · {text.kicker}
      </p>
      <div className="mt-3 flex items-baseline gap-4">
        <span className="font-mono text-sm text-muted">{chapter.number}</span>
        <h2 className="font-serif text-4xl leading-tight md:text-5xl">{text.title}</h2>
      </div>
      <p className="mt-2 font-mono text-xs text-muted">{text.meta}</p>
      <p className="mt-5 text-lg leading-relaxed text-ink/80">{text.description}</p>
      <hr className="mt-8 border-line" />
    </header>
  );
}

function ChapterBody({
  chapterId,
  chapter,
  lang,
}: {
  chapterId: string;
  chapter: Chapter;
  lang: Lang;
}) {
  const Lab = LAB_COMPONENTS[chapterId];
  return Lab ? <Lab /> : <ComingSoon chapter={chapter} lang={lang} />;
}

function ComingSoon({ chapter, lang }: { chapter: Chapter; lang: Lang }) {
  const moduleTitle = lang === 'en' ? MODULES_EN[chapter.module] : MODULES[chapter.module].title;
  return (
    <section className="mt-10 max-w-3xl rounded-lg border border-dashed border-line bg-paper-deep p-8">
      <p className="font-mono text-xs tracking-[0.15em] text-ember">
        {t(lang, 'comingSoonKicker')}
      </p>
      <h3 className="mt-3 font-serif text-2xl">{t(lang, 'comingSoonTitle')}</h3>
      <p className="mt-3 leading-relaxed text-ink/75">
        {t(lang, 'comingSoonBodyPrefix')} {MODULES[chapter.module].label}「{moduleTitle}」
        {t(lang, 'comingSoonBodySuffix')}
      </p>
      {chapter.sourceFiles.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {chapter.sourceFiles.map((f) => (
            <li key={f} className="font-mono text-sm text-blue">
              {f}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChapterFooter({
  chapter,
  onNavigate,
  lang,
}: {
  chapter: Chapter;
  onNavigate: (id: string) => void;
  lang: Lang;
}) {
  const progress = useProgress();
  const prev = prevChapter(chapter.id);
  const next = nextChapter(chapter.id);
  const complete = progress.chapters[chapter.id] === 'complete';
  const implemented = chapter.id in LAB_COMPONENTS;

  return (
    <footer className="mt-14 max-w-3xl">
      {implemented && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (complete) {
                setChapterStatus(chapter.id, 'reading');
              } else {
                markChapterComplete(chapter.id);
                if (next) onNavigate(next.id);
              }
            }}
            className={`rounded px-5 py-2.5 font-mono text-sm transition-colors ${
              complete
                ? 'border border-green bg-green/10 text-green'
                : 'bg-ink text-acid hover:bg-ink/90'
            }`}
          >
            {complete
              ? t(lang, 'completeUndo')
              : next
                ? t(lang, 'completeAndNext')
                : t(lang, 'completeOnly')}
          </button>
        </div>
      )}
      <div className="mt-8 flex items-center justify-between border-t border-line pt-6 font-mono text-sm">
        {prev ? (
          <button
            type="button"
            onClick={() => onNavigate(prev.id)}
            className="text-blue hover:underline"
          >
            ‹ {prev.number} {chapterText(prev, lang).title}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button
            type="button"
            onClick={() => onNavigate(next.id)}
            className="text-blue hover:underline"
          >
            {next.number} {chapterText(next, lang).title} ›
          </button>
        ) : (
          <span />
        )}
      </div>
    </footer>
  );
}
