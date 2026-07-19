import { useSyncExternalStore } from 'react';
import { getSnapshot, isComplete, setItem, subscribe } from '../lib/progress';

interface CheckpointProps {
  id: string;
  label?: string;
}

export default function Checkpoint({ id, label = '标记本节完成' }: CheckpointProps) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const done = isComplete(`checkpoint:${id}`);
  return (
    <button
      type="button"
      className="ht-checkpoint"
      data-done={done}
      onClick={() => setItem(`checkpoint:${id}`, !done)}
    >
      {done ? '✅ 已完成' : label}
    </button>
  );
}
