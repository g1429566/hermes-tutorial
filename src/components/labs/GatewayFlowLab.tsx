'use client';

import { useState } from 'react';
import { CodeBlock, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

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

export default function GatewayFlowLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:gateway-flow'];
  const initial =
    saved && typeof saved === 'object' && 'step' in saved && typeof saved.step === 'string'
      ? saved.step
      : FLOW_STEPS[0].id;
  const [stepId, setStepId] = useState(initial);

  const step = FLOW_STEPS.find((s) => s.id === stepId) ?? FLOW_STEPS[0];
  const idx = FLOW_STEPS.findIndex((s) => s.id === step.id);

  function select(id: string) {
    setStepId(id);
    setLabResult('lab:gateway-flow', { step: id });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{FLOW_INTRO}</p>

      <div className="mt-8">
        <Stepper
          steps={FLOW_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={step.id}
          onChange={select}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
            STEP {idx + 1}/{FLOW_STEPS.length} · {step.label}
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
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted">要点</p>
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
              onClick={() => select(FLOW_STEPS[idx - 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              ‹ 上一步
            </button>
            <button
              type="button"
              disabled={idx === FLOW_STEPS.length - 1}
              onClick={() => select(FLOW_STEPS[idx + 1].id)}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              下一步 ›
            </button>
          </div>
        </div>
      </div>

      <SectionHeading kicker="语音" title={STT_NOTE.title} />
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-6">
          <p className="text-sm leading-relaxed text-ink/75">{STT_NOTE.body}</p>
          <ul className="mt-4 space-y-2">
            {STT_NOTE.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                <span className="mt-0.5 text-acid">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <CodeBlock file="config.yaml" lines="stt: 段" code={STT_NOTE.code} />
      </div>

      <SectionHeading kicker="连续性" title={HANDOFF_NOTE.title} />
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-6">
          <p className="text-sm leading-relaxed text-ink/75">{HANDOFF_NOTE.body}</p>
          <ul className="mt-4 space-y-2">
            {HANDOFF_NOTE.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink/80">
                <span className="mt-0.5 text-acid">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <CodeBlock file="CLI 会话内" code={HANDOFF_NOTE.code} />
      </div>

      <SectionHeading kicker="后台通知" title="后台进程完成通知" />
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink/75">{BG_NOTIFY_BODY}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BG_NOTIFY_MODES.map((m) => (
          <div key={m.id} className="rounded-lg border border-line bg-white p-4">
            <p className="font-mono text-sm text-ember">{m.name}</p>
            <p className="mt-1.5 text-sm text-ink/70">{m.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
