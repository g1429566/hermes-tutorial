'use client';

import { useReducer } from 'react';
import { advanceMemory, INITIAL_MEMORY_EXERCISE } from '@/lib/memory-exercise';
import { useLang } from '@/lib/i18n';

export default function MemoryTimeline() {
  const { lang } = useLang();
  const zh = lang === 'zh';
  const [state, dispatch] = useReducer(advanceMemory, INITIAL_MEMORY_EXERCISE);
  const present = (value: boolean) =>
    value
      ? zh
        ? '有新偏好'
        : 'New preference present'
      : zh
        ? '无新偏好'
        : 'New preference absent';
  const outcomes = {
    initial: zh
      ? '初始文件和快照都没有这条偏好。'
      : 'Neither the file nor snapshot contains the preference.',
    staged: zh
      ? '仅进入待审批；磁盘与当前快照都没有因提案而改变。'
      : 'Staged only: the proposal has not changed disk or the active snapshot.',
    saved: zh
      ? '磁盘已保存；当前会话仍使用启动时的快照。当前用户消息和工具结果可以包含新事实。'
      : 'Saved to disk; the current snapshot remains fixed. Recent messages and tool results can still contain the new fact.',
    started: zh
      ? '新会话只读取磁盘上已经应用的内容；待审批提案仍未应用。'
      : 'The new session reads applied disk state. A pending proposal is still pending.',
  };
  return (
    <div className="mt-8 max-w-3xl rounded-lg border border-line bg-white p-5">
      <h3 className="font-serif text-2xl">
        {zh ? '先预测，再保存与新建会话' : 'Predict, save, then start a session'}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {zh
          ? '纸上状态模拟：只追踪“默认中文”这条新偏好，不访问真实 Hermes。先尝试待审批，再比较直接保存与新会话。'
          : 'State simulation for one new language preference; no real Hermes access. Try staging, then compare saving and starting a new session.'}
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          [zh ? '磁盘记忆' : 'Disk memory', present(state.disk)],
          [
            zh ? `会话 ${state.session} 初始快照` : `Session ${state.session} snapshot`,
            present(state.snapshot),
          ],
          [
            zh ? '待审批' : 'Pending',
            state.pending ? (zh ? '有提案' : 'Proposal staged') : zh ? '无提案' : 'None',
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded bg-paper-deep p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-2 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ['stage', zh ? '提出待审批写入' : 'Stage a write'],
            ['save', zh ? '模拟直接保存' : 'Save directly'],
            ['approve', zh ? '批准提案' : 'Approve proposal'],
            ['new-session', zh ? '新建会话' : 'Start new session'],
            ['reset', zh ? '重置' : 'Reset'],
          ] as const
        ).map(([action, label]) => (
          <button
            type="button"
            key={action}
            disabled={action === 'approve' && !state.pending}
            onClick={() => dispatch(action)}
            className="rounded border border-line px-3 py-2 text-sm hover:border-ink disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-4 text-sm leading-relaxed">
        {outcomes[state.outcome]}
      </p>
    </div>
  );
}
