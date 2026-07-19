import { useSyncExternalStore } from 'react';
import { clearProgress, getSnapshot, subscribe } from '../lib/progress';

export default function ProgressBar() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const count = Object.values(state.items).filter(Boolean).length;

  return (
    <div className="ht-progress">
      <span>
        📊 学习进度：已完成 {count} 项
      </span>
      {count > 0 && (
        <button
          type="button"
          className="ht-progress-reset"
          onClick={() => {
            if (confirm('确定要重置全部学习进度吗？')) clearProgress();
          }}
        >
          重置
        </button>
      )}
    </div>
  );
}
