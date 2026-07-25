'use client';

import { useState } from 'react';
import {
  ADD_COMMAND_STEPS,
  ADD_COMMAND_STEPS_EN,
  CLI_COMMANDS,
  CLI_COMMANDS_EN,
  CLI_INTRO,
  CLI_INTRO_EN,
  CLI_UI,
  COMMAND_CATEGORIES,
  COMMAND_DEF_FIELDS,
  COMMAND_DEF_FIELDS_EN,
  REGISTRY_CONSUMERS,
  REGISTRY_CONSUMERS_EN,
  REGISTRY_NOTE,
  REGISTRY_NOTE_EN,
} from '@/data/cli';
import { CodeBlock, CompareSelect, DetailPanel, SectionHeading, Stepper } from './primitives';
import { setLabResult } from '@/lib/progress-v2';
import { useProgress } from '@/hooks/useProgress';
import { pick, useLang } from '@/lib/i18n';

// Chapter 15「CLI 架构」：CommandDef 字段 → 命令树 → 注册表消费者 → 添加命令四步。
export default function CliLab() {
  const { lang } = useLang();
  const intro = lang === 'en' ? CLI_INTRO_EN : CLI_INTRO;
  const commandDefFields = lang === 'en' ? COMMAND_DEF_FIELDS_EN : COMMAND_DEF_FIELDS;
  const cliCommands = lang === 'en' ? CLI_COMMANDS_EN : CLI_COMMANDS;
  const registryConsumers = lang === 'en' ? REGISTRY_CONSUMERS_EN : REGISTRY_CONSUMERS;
  const registryNote = lang === 'en' ? REGISTRY_NOTE_EN : REGISTRY_NOTE;
  const addCommandSteps = lang === 'en' ? ADD_COMMAND_STEPS_EN : ADD_COMMAND_STEPS;
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

  const field = commandDefFields.find((f) => f.id === fieldId) ?? commandDefFields[0];
  const allCommands = COMMAND_CATEGORIES.flatMap((c) => cliCommands[c]);
  const command = allCommands.find((c) => c.id === commandId) ?? allCommands[0];
  const consumer = registryConsumers.find((c) => c.id === consumerId) ?? registryConsumers[0];
  const step = addCommandSteps.find((f) => f.id === stepId) ?? addCommandSteps[0];

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
      <p className="max-w-3xl leading-relaxed text-ink/75">{intro}</p>

      {/* ── ① CommandDef 字段 ──────────────────────────────────── */}
      <SectionHeading
        kicker={pick(lang, CLI_UI.fieldsKicker)}
        title={pick(lang, CLI_UI.fieldsTitle)}
      />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        {pick(lang, CLI_UI.fieldsDesc)}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {commandDefFields.map((f) => {
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
            <span className="mr-2 font-mono text-[11px] tracking-[0.15em] text-white/40">
              {pick(lang, CLI_UI.exampleLabel)}
            </span>
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-ember">
              {field.example}
            </code>
          </p>
        </DetailPanel>
      </div>

      {/* ── ② 命令树 ───────────────────────────────────────────── */}
      <SectionHeading kicker={pick(lang, CLI_UI.treeKicker)} title={pick(lang, CLI_UI.treeTitle)} />
      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {COMMAND_CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="kicker">{cat}</p>
              <div className="mt-1.5 space-y-1.5">
                {cliCommands[cat].map((c) => {
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
                  {pick(lang, CLI_UI.aliasesLabel)}{' '}
                  <code className="font-mono text-xs text-ember">{command.aliases}</code>
                </span>
              )}
              {command.argsHint && (
                <span className="text-ink/70">
                  {pick(lang, CLI_UI.argsLabel)}{' '}
                  <code className="font-mono text-xs text-ember">{command.argsHint}</code>
                </span>
              )}
              {command.flags.length > 0 && (
                <span className="text-ink/70">
                  {pick(lang, CLI_UI.flagsLabel)}{' '}
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
              note={pick(lang, CLI_UI.snippetNote)}
            />
          </div>
        </div>
      </div>

      {/* ── ③ 注册表驱动一切 ───────────────────────────────────── */}
      <SectionHeading
        kicker={pick(lang, CLI_UI.consumersKicker)}
        title={pick(lang, CLI_UI.consumersTitle)}
      />
      <div className="mt-6">
        <CompareSelect
          options={registryConsumers.map((c) => ({ id: c.id, name: c.name, tagline: c.deriver }))}
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
        {registryNote}
      </p>

      {/* ── ④ 添加命令四步 ─────────────────────────────────────── */}
      <SectionHeading kicker={pick(lang, CLI_UI.addKicker)} title={pick(lang, CLI_UI.addTitle)} />
      <div className="mt-6">
        <Stepper
          steps={addCommandSteps.map((f) => ({ id: f.id, label: f.label }))}
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
        {pick(lang, CLI_UI.takeaway)}
      </p>
    </section>
  );
}
