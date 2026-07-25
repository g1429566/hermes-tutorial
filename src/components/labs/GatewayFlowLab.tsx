'use client';

import { useState } from 'react';
import { CodeBlock, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { pick, useLang } from '@/lib/i18n';
import { t } from '@/data/ui-strings';

// Chapter 11「消息网关（下）」：消息流转 Stepper + 语音转录 / 跨平台连续性 / 后台通知。
// 事实来源：AGENTS.md「The gateway has TWO message guards」、gateway/session.py、
// hermes_cli/commands.py、website/docs/user-guide/{sessions.md,features/voice-mode.md}。

interface FlowStep {
  id: string;
  label: string;
  title: string;
  body: string;
  code: { file: string; lines?: string; snippet: string; note?: string };
  points: string[];
}

const FLOW_INTRO =
  '一条平台消息从进来到回复，要穿过五站：平台入站 → adapter 统一成事件 → session 路由（这里有' +
  '两道消息守卫，决定消息排队还是直达）→ agent 主循环 → 回复路由回原平台。' +
  '点击下面五站，追踪一条消息的完整旅程。';

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'inbound',
    label: 'INBOUND',
    title: '平台消息进来',
    body: '各 adapter 用自己的方式收消息：轮询、webhook、WebSocket……协议千差万别，但入口只有一个职责——尽快把原始载荷翻译成网关的统一事件，不在 adapter 里塞业务逻辑。',
    code: {
      file: 'gateway/platforms/base.py',
      lines: 'BasePlatformAdapter',
      snippet: `# 每个 adapter 继承 BasePlatformAdapter：
# connect() / disconnect() 管生命周期，
# 入站消息统一包装成 MessageEvent 交给网关。`,
    },
    points: [
      'adapter 只翻译协议，不做会话决策',
      '用独立凭据的 adapter 在 connect() 里 acquire_scoped_lock，防 profile 抢 token',
      '按钮回调（审批 / clarify）也走同一个入站通道',
    ],
  },
  {
    id: 'adapt',
    label: 'ADAPT',
    title: 'adapter 统一成事件',
    body: '平台差异在这一站被抹平：SessionSource 记录消息从哪来（platform + chat_id + chat_type + thread_id + scope_id……），它既是回复路由的地址，也是 session 归属的依据。Discord guild、Slack workspace、Matrix server 统一折进 scope_id 做工作区隔离。',
    code: {
      file: 'gateway/session.py',
      lines: 'class SessionSource',
      snippet: `class SessionSource:
    """Describes where a message originated from.

    1. Route responses back to the right place
    2. Inject context into the system prompt
    3. Track origin for cron job delivery
    """
    platform: Platform
    chat_id: str
    chat_type: str = "dm"   # "dm", "group", "channel", "thread"
    thread_id: Optional[str] = None
    scope_id: Optional[str] = None  # Discord guild / Slack workspace / Matrix server`,
    },
    points: [
      'SessionSource 是三用的：回路由、注入 system prompt、cron 投递寻址',
      'profile 字段支持一台网关多路复用到不同 profile',
      'relay 送达的事件带 delivered_via_upstream_relay 信任标记（不落盘、不可伪造）',
    ],
  },
  {
    id: 'guards',
    label: 'GUARDS',
    title: 'session 路由：两道消息守卫',
    body: 'build_session_key 决定消息进哪个会话。如果该会话的 agent 正在跑，消息要连过两道守卫：第一道在 base adapter——session_key 已在 _active_sessions 里，消息进 _pending_messages 排队等下一回合；第二道在 gateway runner——/stop、/new、/queue、/status、/approve、/deny 这类控制命令被拦截下来 inline 分发，直达 running_agent.interrupt() 等处理器，绝不能排队（审批提示在等答复，排队就死锁）。新控制命令必须同时绕过两道守卫，且不走 _process_message_background()（那会与会话生命周期竞争）。',
    code: {
      file: 'hermes_cli/commands.py',
      lines: 'ACTIVE_SESSION_BYPASS_COMMANDS',
      snippet: `ACTIVE_SESSION_BYPASS_COMMANDS: frozenset[str] = frozenset(
    {
        "agents", "approve", "background", "commands", "deny",
        "help", "new", "profile", "queue", "restart",
        "status", "steer", "stop", "update", "version",
    }
)
# 真正的 bypass 集更大：should_bypass_active_session()
# 对任何可解析的 slash 命令都返回 True——排队对命令永远是错的`,
      note: '守卫一在 gateway/platforms/base.py：_pending_messages[session_key] 排队',
    },
    points: [
      '守卫一：base.py 的 _pending_messages——普通消息排队成 follow-up 回合',
      '守卫二：run.py 拦截控制命令，inline 分发不排队',
      '命令经中央注册表 resolve_command() 解析——CLI 与网关同一份定义',
    ],
  },
  {
    id: 'agent',
    label: 'AGENT',
    title: 'agent 主循环处理',
    body: '过了守卫，消息进入 AIAgent.run_conversation()——就是第 04 章那个 while 循环，和 CLI 里一模一样。网关会话的 transcript 持久化，重启后 replay 恢复；平台来源会注入 system prompt，agent 知道自己正在 Telegram 群里还是 Slack 线程里说话。',
    code: {
      file: 'gateway/run.py',
      lines: 'class GatewayRunner',
      snippet: `# 网关缓存每个 session 的 agent 实例；
# 若内存中的 live transcript 比落盘副本更长，
# 重启后优先保留 live 版本——避免同会话失忆`,
    },
    points: [
      '同一个 run_agent.py 主循环，平台只是输入来源',
      'transcript 带时间戳落盘，支持跨重启 replay',
      '长 live transcript 优先于短的持久化副本（防失忆）',
    ],
  },
  {
    id: 'reply',
    label: 'REPLY',
    title: '回复路由回原平台',
    body: 'agent 的回复按 SessionSource 路由回去：adapter 负责按平台能力渲染——支持 streaming 的平台边生成边改消息，支持按钮的平台把审批/clarify 渲染成可点按钮。send_message 与 cron 投递还会经 gateway/mirror.py 往目标会话写一条 delivery-mirror 记录，接收侧的 agent 因此知道自己说过什么。',
    code: {
      file: 'gateway/mirror.py',
      lines: 'mirror_to_session()',
      snippet: `def mirror_to_session(
    platform: str,
    chat_id: str,
    message_text: str,
    source_label: str = "cli",
    ...
) -> bool:
    """Append a delivery-mirror message to the target session's
    transcript — the receiving-side agent has context about
    what was sent."""`,
    },
    points: [
      '回复目标 = SessionSource（platform + chat_id + thread_id）',
      'streaming / 按钮 / 表情回复按平台能力降级',
      'delivery-mirror 让跨平台发送在接收侧会话里留痕',
    ],
  },
];

/* ── 小节数据 ─────────────────────────────────────────────────────── */

const STT_NOTE = {
  title: '语音消息转录（stt）',
  body: '用户发来语音，音频附件自动进入 STT pipeline（run.py 的 _event_media_is_stt_input 判断），转录文本再交给 agent——agent 看到的始终是文字。config.yaml 的 stt: 段控制开关与 provider：local 用 faster-whisper 本地跑，免费、不需要任何 API key（base 模型约 150 MB，首次使用自动下载）；也可以接 groq / openai / mistral / xai。',
  code: `# config.yaml
stt:
  enabled: true        # false 则跳过自动转录
  provider: "local"    # "local"(免费) | "groq" | "openai" | "mistral" | "xai"
  # model: "whisper-1" # 旧式写法：未设 provider 时使用`,
  codeFile: 'config.yaml',
  codeLines: 'stt: 段',
  points: [
    '转录是入站管道的一环：语音 → 文字 → 正常消息流程',
    '本地 provider 零成本零配置（pip install faster-whisper）',
    '回播语音是 TTS 的活，与 STT 独立开关（/voice 命令控制）',
  ],
};

const HANDOFF_NOTE = {
  title: '跨平台连续性：/handoff 与 /resume',
  body: '会话不锁死在某个平台上。CLI 会话里输入 /handoff <platform>，网关会把 live 会话移交到目标平台的 home channel——同一个 session id、完整的角色感知 transcript、连工具调用记录都在。网关先让目标 adapter 开一个新线程锚点：Telegram 开 forum topic，Discord 建 1440 分钟自动归档 thread，Slack 以一条 seed 消息的 ts 作锚，WhatsApp / Signal / Matrix / SMS 没有原生线程则回落到 home channel。随后网关把目标 key 重新绑定到原 session id，对话就地继续。想回桌面，/resume <title> 随时接回来。',
  code: `# 在 CLI 会话里
/handoff telegram

# ↻ Handoff complete. The session is now active on telegram.
#   Resume it on this CLI later with: /resume my-session-title`,
  codeFile: 'CLI 会话内',
  points: [
    '先 /sethome 在目标聊天里配置 home channel，/handoff 才能定位',
    'agent 正在输出时拒绝移交——等当前回合结束',
    '线程会话按 thread 而非 user_id 归键：频道里被授权的人共享同一会话',
  ],
};

const BG_NOTIFY_MODES = [
  { id: 'all', name: 'all（默认）', desc: '运行中输出更新 + 最终完成消息，全量播报' },
  { id: 'result', name: 'result', desc: '只发最终完成消息，过程不打扰' },
  { id: 'error', name: 'error', desc: '只在退出码非 0 时发最终消息——安静但不错过失败' },
  { id: 'off', name: 'off', desc: '完全不发 watcher 消息' },
];

const BG_NOTIFY_BODY =
  'terminal(background=true, notify_on_complete=true) 启动的后台进程，由网关 watcher 盯着：进程一结束就触发一个新的 agent 回合汇报结果。' +
  '吵不吵由 config.yaml 的 display.background_process_notifications（或环境变量 HERMES_BACKGROUND_NOTIFICATIONS）控制，四档可选。';

/* ── 英文版（结构与上方中文常量一一对应） ──────────────────────── */

const FLOW_INTRO_EN =
  'A platform message passes through five stations from arrival to reply: platform inbound → ' +
  'adapter unifies it into an event → session routing (two message guards live here, deciding ' +
  'whether a message queues or goes straight through) → the agent main loop → the reply is ' +
  'routed back to the original platform. Click the five stations below to trace the full ' +
  'journey of one message.';

const FLOW_STEPS_EN: FlowStep[] = [
  {
    id: 'inbound',
    label: 'INBOUND',
    title: 'A platform message arrives',
    body: "Each adapter receives messages its own way: polling, webhook, WebSocket…… Protocols vary wildly, but the entry point has exactly one job — translate the raw payload into the gateway's unified event as fast as possible, with no business logic stuffed into the adapter.",
    code: {
      file: 'gateway/platforms/base.py',
      lines: 'BasePlatformAdapter',
      snippet: `# 每个 adapter 继承 BasePlatformAdapter：
# connect() / disconnect() 管生命周期，
# 入站消息统一包装成 MessageEvent 交给网关。`,
    },
    points: [
      'Adapters only translate protocols; they make no session decisions',
      'Adapters with their own credentials call acquire_scoped_lock in connect() to stop profiles fighting over a token',
      'Button callbacks (approvals / clarify) travel the same inbound channel',
    ],
  },
  {
    id: 'adapt',
    label: 'ADAPT',
    title: 'The adapter unifies it into an event',
    body: 'Platform differences are flattened at this station: SessionSource records where a message came from (platform + chat_id + chat_type + thread_id + scope_id……) — it is both the address for reply routing and the basis for session ownership. Discord guilds, Slack workspaces, and Matrix servers all fold into scope_id for workspace isolation.',
    code: {
      file: 'gateway/session.py',
      lines: 'class SessionSource',
      snippet: `class SessionSource:
    """Describes where a message originated from.

    1. Route responses back to the right place
    2. Inject context into the system prompt
    3. Track origin for cron job delivery
    """
    platform: Platform
    chat_id: str
    chat_type: str = "dm"   # "dm", "group", "channel", "thread"
    thread_id: Optional[str] = None
    scope_id: Optional[str] = None  # Discord guild / Slack workspace / Matrix server`,
    },
    points: [
      'SessionSource is triple-purpose: reply routing, system-prompt injection, cron delivery addressing',
      'The profile field lets one gateway multiplex into different profiles',
      'Events delivered via relay carry the delivered_via_upstream_relay trust marker (not persisted, unforgeable)',
    ],
  },
  {
    id: 'guards',
    label: 'GUARDS',
    title: 'Session routing: two message guards',
    body: "build_session_key decides which session a message enters. If that session's agent is running, the message must pass two guards: the first is in the base adapter — if the session_key is already in _active_sessions, the message queues in _pending_messages for the next turn; the second is in the gateway runner — control commands like /stop, /new, /queue, /status, /approve, /deny are intercepted and dispatched inline, straight to handlers like running_agent.interrupt(), and must never queue (an approval prompt is waiting for an answer; queueing deadlocks it). New control commands must bypass both guards and must not go through _process_message_background() (which would race the session lifecycle).",
    code: {
      file: 'hermes_cli/commands.py',
      lines: 'ACTIVE_SESSION_BYPASS_COMMANDS',
      snippet: `ACTIVE_SESSION_BYPASS_COMMANDS: frozenset[str] = frozenset(
    {
        "agents", "approve", "background", "commands", "deny",
        "help", "new", "profile", "queue", "restart",
        "status", "steer", "stop", "update", "version",
    }
)
# 真正的 bypass 集更大：should_bypass_active_session()
# 对任何可解析的 slash 命令都返回 True——排队对命令永远是错的`,
      note: 'Guard one lives in gateway/platforms/base.py: _pending_messages[session_key] queueing',
    },
    points: [
      'Guard one: _pending_messages in base.py — ordinary messages queue as follow-up turns',
      'Guard two: run.py intercepts control commands and dispatches them inline, no queueing',
      'Commands are resolved via the central registry resolve_command() — one definition shared by CLI and gateway',
    ],
  },
  {
    id: 'agent',
    label: 'AGENT',
    title: 'The agent main loop handles it',
    body: 'Past the guards, the message enters AIAgent.run_conversation() — the same while loop as Chapter 04, identical to the CLI. Gateway session transcripts are persisted and replayed after a restart; the platform origin is injected into the system prompt, so the agent knows whether it is speaking in a Telegram group or a Slack thread.',
    code: {
      file: 'gateway/run.py',
      lines: 'class GatewayRunner',
      snippet: `# 网关缓存每个 session 的 agent 实例；
# 若内存中的 live transcript 比落盘副本更长，
# 重启后优先保留 live 版本——避免同会话失忆`,
    },
    points: [
      'The same run_agent.py main loop; platforms are just input sources',
      'Transcripts are persisted with timestamps and support replay across restarts',
      'A longer live transcript wins over a shorter persisted copy (prevents amnesia)',
    ],
  },
  {
    id: 'reply',
    label: 'REPLY',
    title: 'The reply is routed back to the platform',
    body: "The agent's reply is routed back by SessionSource: the adapter renders it per platform capability — platforms with streaming edit the message as it generates, platforms with buttons render approvals/clarify as clickable buttons. send_message and cron deliveries also write a delivery-mirror record into the target session via gateway/mirror.py, so the receiving-side agent knows what was said in its name.",
    code: {
      file: 'gateway/mirror.py',
      lines: 'mirror_to_session()',
      snippet: `def mirror_to_session(
    platform: str,
    chat_id: str,
    message_text: str,
    source_label: str = "cli",
    ...
) -> bool:
    """Append a delivery-mirror message to the target session's
    transcript — the receiving-side agent has context about
    what was sent."""`,
    },
    points: [
      'Reply target = SessionSource (platform + chat_id + thread_id)',
      'Streaming / buttons / reactions degrade per platform capability',
      'delivery-mirror leaves a trace of cross-platform sends in the receiving session',
    ],
  },
];

const STT_NOTE_EN: typeof STT_NOTE = {
  title: 'Voice message transcription (stt)',
  body: "When a user sends a voice message, the audio attachment automatically enters the STT pipeline (run.py's _event_media_is_stt_input decides), and the transcribed text is handed to the agent — the agent always sees text. The stt: section in config.yaml controls the switch and the provider: local runs faster-whisper locally, free, no API key needed (the base model is ~150 MB, downloaded automatically on first use); groq / openai / mistral / xai are also supported.",
  code: `# config.yaml
stt:
  enabled: true        # false 则跳过自动转录
  provider: "local"    # "local"(免费) | "groq" | "openai" | "mistral" | "xai"
  # model: "whisper-1" # 旧式写法：未设 provider 时使用`,
  codeFile: 'config.yaml',
  codeLines: 'stt: section',
  points: [
    'Transcription is one stage of the inbound pipeline: voice → text → the normal message flow',
    'The local provider is zero-cost and zero-config (pip install faster-whisper)',
    "Voice playback is TTS's job, with an independent switch (the /voice command)",
  ],
};

const HANDOFF_NOTE_EN: typeof HANDOFF_NOTE = {
  title: 'Cross-platform continuity: /handoff and /resume',
  body: "A session is not locked to one platform. Type /handoff <platform> in a CLI session and the gateway moves the live session to the target platform's home channel — same session id, full role-aware transcript, tool-call records included. The gateway first has the target adapter open a new thread anchor: Telegram opens a forum topic, Discord creates a 1440-minute auto-archive thread, Slack anchors on the ts of a seed message, and WhatsApp / Signal / Matrix / SMS, having no native threads, fall back to the home channel. The gateway then rebinds the target key to the original session id and the conversation continues in place. To go back to the desktop, /resume <title> brings it back anytime.",
  code: `# 在 CLI 会话里
/handoff telegram

# ↻ Handoff complete. The session is now active on telegram.
#   Resume it on this CLI later with: /resume my-session-title`,
  codeFile: 'inside a CLI session',
  points: [
    'Configure the home channel in the target chat with /sethome first, or /handoff has nowhere to land',
    'Handoff is refused while the agent is mid-output — wait for the current turn to end',
    'Thread sessions are keyed by thread, not user_id: authorized people in the channel share the same session',
  ],
};

const BG_NOTIFY_MODES_EN: typeof BG_NOTIFY_MODES = [
  {
    id: 'all',
    name: 'all (default)',
    desc: 'Output updates while running + the final completion message — full reporting',
  },
  { id: 'result', name: 'result', desc: 'Only the final completion message; no mid-run noise' },
  {
    id: 'error',
    name: 'error',
    desc: 'Final message only on a non-zero exit code — quiet, but failures are never missed',
  },
  { id: 'off', name: 'off', desc: 'No watcher messages at all' },
];

const BG_NOTIFY_BODY_EN =
  'Background processes started with terminal(background=true, notify_on_complete=true) are watched by the gateway watcher: the moment a process exits, a new agent turn is triggered to report the result. ' +
  'How chatty it gets is controlled by display.background_process_notifications in config.yaml (or the HERMES_BACKGROUND_NOTIFICATIONS environment variable), with four levels.';

// 本章专属 UI 文案（组件硬编码部分）。
const FLOW_UI = {
  sttKicker: { zh: '语音', en: 'Voice' },
  handoffKicker: { zh: '连续性', en: 'Continuity' },
  bgKicker: { zh: '后台通知', en: 'Background notify' },
  bgTitle: { zh: '后台进程完成通知', en: 'Background process completion notifications' },
};

export default function GatewayFlowLab() {
  const { lang } = useLang();
  const steps = lang === 'en' ? FLOW_STEPS_EN : FLOW_STEPS;
  const sttNote = lang === 'en' ? STT_NOTE_EN : STT_NOTE;
  const handoffNote = lang === 'en' ? HANDOFF_NOTE_EN : HANDOFF_NOTE;
  const bgModes = lang === 'en' ? BG_NOTIFY_MODES_EN : BG_NOTIFY_MODES;
  const progress = useProgress();
  const saved = progress.labResults['lab:gateway-flow'];
  const initial =
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : steps[0].id;
  const [stepId, setStepId] = useState(initial);

  const step = steps.find((s) => s.id === stepId) ?? steps[0];
  const idx = steps.findIndex((s) => s.id === step.id);

  function select(id: string) {
    setStepId(id);
    setLabResult('lab:gateway-flow', { step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">
        {lang === 'en' ? FLOW_INTRO_EN : FLOW_INTRO}
      </p>

      <div className="mt-8">
        <Stepper
          steps={steps.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={select}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
            STEP {idx + 1}/{steps.length} · {step.label}
          </p>
          <h3 className="mt-2 font-serif text-2xl">{step.title}</h3>
          <p className="mt-3 leading-relaxed text-ink/75">{step.body}</p>
          <div className="mt-5">
            <CodeBlock
              file={step.code.file}
              lines={step.code.lines}
              code={step.code.snippet}
              note={step.code.note}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">
              {t(lang, 'keyPoints')}
            </p>
            <ul className="mt-3 space-y-2">
              {step.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <span className="mt-0.5 text-acid">▸</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => select(steps[idx - 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              {t(lang, 'prevStep')}
            </button>
            <button
              type="button"
              disabled={idx === steps.length - 1}
              onClick={() => select(steps[idx + 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              {t(lang, 'nextStep')}
            </button>
          </div>
        </div>
      </div>

      <SectionHeading kicker={pick(lang, FLOW_UI.sttKicker)} title={sttNote.title} />
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-6">
          <p className="text-sm leading-relaxed text-ink/75">{sttNote.body}</p>
          <ul className="mt-4 space-y-2">
            {sttNote.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                <span className="mt-0.5 text-acid">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <CodeBlock file={sttNote.codeFile} lines={sttNote.codeLines} code={sttNote.code} />
      </div>

      <SectionHeading kicker={pick(lang, FLOW_UI.handoffKicker)} title={handoffNote.title} />
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-6">
          <p className="text-sm leading-relaxed text-ink/75">{handoffNote.body}</p>
          <ul className="mt-4 space-y-2">
            {handoffNote.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                <span className="mt-0.5 text-acid">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <CodeBlock file={handoffNote.codeFile} code={handoffNote.code} />
      </div>

      <SectionHeading kicker={pick(lang, FLOW_UI.bgKicker)} title={pick(lang, FLOW_UI.bgTitle)} />
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink/75">
        {lang === 'en' ? BG_NOTIFY_BODY_EN : BG_NOTIFY_BODY}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {bgModes.map((m) => (
          <div key={m.id} className="rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-sm text-ember">{m.name}</p>
            <p className="mt-1.5 text-sm text-ink/70">{m.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
