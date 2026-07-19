'use client';

import { useState } from 'react';
import {
  ADD_COMMAND_STEPS,
  CLI_COMMANDS,
  CLI_INTRO,
  COMMAND_CATEGORIES,
  COMMAND_DEF_FIELDS,
  REGISTRY_CONSUMERS,
  REGISTRY_NOTE,
} from '@/data/cli';
import { CodeBlock, CompareSelect, DetailPanel, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';

// Chapter 15「CLI 架构」：CommandDef 字段 → 命令树 → 注册表消费者 → 添加命令四步。
export default function CliLab() {
  const progress = useProgress();
  const saved = progress.labResults['lab:cli'];
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};

  const [fieldId, setFieldId] = useState(
    typeof s.field === 'string' ? s.field : COMMAND_DEF_FIELDS[0].id,
  );
  const [commandId, setCommandId] = useState(
    typeof s.command === 'string' ? s.command : CLI_COMMANDS.Session[0].id,
  );
  const [consumerId, setConsumerId] = useState(
    typeof s.consumer === 'string' ? s.consumer : REGISTRY_CONSUMERS[0].id,
  );
  const [stepId, setStepId] = useState(
    typeof s.step === 'string' ? s.step : ADD_COMMAND_STEPS[0].id,
  );

  const field = COMMAND_DEF_FIELDS.find((f) => f.id === fieldId) ?? COMMAND_DEF_FIELDS[0];
  const allCommands = COMMAND_CATEGORIES.flatMap((c) => CLI_COMMANDS[c]);
  const command = allCommands.find((c) => c.id === commandId) ?? allCommands[0];
  const consumer = REGISTRY_CONSUMERS.find((c) => c.id === consumerId) ?? REGISTRY_CONSUMERS[0];
  const step = ADD_COMMAND_STEPS.find((f) => f.id === stepId) ?? ADD_COMMAND_STEPS[0];

  function save(next: { field?: string; command?: string; consumer?: string; step?: string }) {
    setLabResult('lab:cli', {
      field: fieldId,
      command: commandId,
      consumer: consumerId,
      step: stepId,
      ...next,
    });
  }

  return (
    <section className="mt-10">
      <p className="max-w-3xl leading-relaxed text-ink/75">{CLI_INTRO}</p>

      {/* ── ① CommandDef 字段 ──────────────────────────────────── */}
      <SectionHeading kicker="单一事实来源" title="CommandDef 的八个字段" />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        COMMAND_REGISTRY 是一个 frozen dataclass 列表。点击每个字段，看它的含义与真实示例。
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {COMMAND_DEF_FIELDS.map((f) => {
          const active = f.id === field.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFieldId(f.id);
                save({ field: f.id });
              }}
              className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
                active
                  ? 'border-ink bg-ink text-acid'
                  : 'border-line bg-white text-ink/70 hover:border-muted'
              }`}
            >
              {f.name}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <DetailPanel kicker={field.type} title={field.name}>
          <p className="mt-4 leading-relaxed text-white/80">{field.desc}</p>
          <p className="mt-4 border-t border-white/10 pt-4 text-sm">
            <span className="mr-2 font-mono text-[11px] tracking-[0.15em] text-white/40">示例</span>
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-ember">
              {field.example}
            </code>
          </p>
        </DetailPanel>
      </div>

      {/* ── ② 命令树 ───────────────────────────────────────────── */}
      <SectionHeading kicker="命令树" title="按 category 分组的命令浏览器" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {COMMAND_CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="kicker">{cat}</p>
              <div className="mt-1.5 space-y-1.5">
                {CLI_COMMANDS[cat].map((c) => {
                  const active = c.id === command.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCommandId(c.id);
                        save({ command: c.id });
                      }}
                      className={`w-full rounded-lg border px-3.5 py-2 text-left transition-colors ${
                        active
                          ? 'border-ink bg-ink text-white shadow-[inset_3px_0_0_0_var(--color-acid)]'
                          : 'border-line bg-white hover:border-muted'
                      }`}
                    >
                      <span
                        className={`font-mono text-sm font-medium ${active ? 'text-acid' : ''}`}
                      >
                        /{c.id}
                      </span>
                      {c.aliases && (
                        <span
                          className={`ml-2 font-mono text-xs ${active ? 'text-white/50' : 'text-muted'}`}
                        >
                          = {c.aliases}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.15em] text-ember">
              /{command.id}
              {command.argsHint ? ` ${command.argsHint}` : ''}
            </p>
            <p className="mt-2 leading-relaxed text-ink/80">{command.desc}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {command.aliases && (
                <span className="text-ink/70">
                  别名 <code className="font-mono text-xs text-ember">{command.aliases}</code>
                </span>
              )}
              {command.argsHint && (
                <span className="text-ink/70">
                  参数 <code className="font-mono text-xs text-ember">{command.argsHint}</code>
                </span>
              )}
              {command.flags.length > 0 && (
                <span className="text-ink/70">
                  标记{' '}
                  {command.flags.map((f) => (
                    <code
                      key={f}
                      className="mr-1.5 rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs text-blue"
                    >
                      {f}
                    </code>
                  ))}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4">
            <CodeBlock
              file="hermes_cli/commands.py"
              lines="COMMAND_REGISTRY"
              code={command.snippet}
              note="逐字摘自真实注册表（长描述以 ... 截断）"
            />
          </div>
        </div>
      </div>

      {/* ── ③ 注册表驱动一切 ───────────────────────────────────── */}
      <SectionHeading kicker="派生" title="一处改动，七个消费者自动同步" />
      <div className="mt-6">
        <CompareSelect
          options={REGISTRY_CONSUMERS.map((c) => ({ id: c.id, name: c.name, tagline: c.deriver }))}
          current={consumer.id}
          onChange={(id) => {
            setConsumerId(id);
            save({ consumer: id });
          }}
        >
          <DetailPanel kicker={consumer.deriver} title={consumer.name}>
            <p className="mt-4 leading-relaxed text-white/80">{consumer.body}</p>
          </DetailPanel>
        </CompareSelect>
      </div>
      <p className="mt-4 max-w-3xl rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-ink/75">
        {REGISTRY_NOTE}
      </p>

      {/* ── ④ 添加命令四步 ─────────────────────────────────────── */}
      <SectionHeading kicker="动手" title="添加一条斜杠命令的四步" />
      <div className="mt-6">
        <Stepper
          steps={ADD_COMMAND_STEPS.map((f) => ({ id: f.id, label: f.label }))}
          current={step.id}
          onChange={(id) => {
            setStepId(id);
            save({ step: id });
          }}
        />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div>
          <h4 className="font-serif text-xl">{step.title}</h4>
          <p className="mt-3 leading-relaxed text-ink/75">{step.body}</p>
        </div>
        <CodeBlock file={step.code.file} code={step.code.snippet} note={step.code.note} />
      </div>

      <p className="mt-10 max-w-3xl rounded-lg border border-acid bg-acid/10 p-5 font-mono text-sm leading-relaxed">
        一句话记住 CLI 架构：COMMAND_REGISTRY 是单一事实来源——命令只定义一次， CLI
        分发、网关、Telegram 菜单、Slack 子命令、补全与 help 全是它的下游。
      </p>
    </section>
  );
}
