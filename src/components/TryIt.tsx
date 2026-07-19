import { useSyncExternalStore } from 'react';
import { getSnapshot, isComplete, setItem, subscribe } from '../lib/progress';

interface TryItProps {
  id: string;
  command: string;
  note?: string;
}

export default function TryIt({ id, command, note }: TryItProps) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const done = isComplete(`tryit:${id}`);

  function copy() {
    navigator.clipboard?.writeText(command).catch(() => {
      /* clipboard unavailable — ignore */
    });
  }

  return (
    <div className="ht-tryit">
      <div className="ht-tryit-title">🖥️ 在终端运行</div>
      <pre className="ht-tryit-cmd">
        <code>{command}</code>
      </pre>
      {note && <p className="ht-tryit-note">{note}</p>}
      <div className="ht-tryit-actions">
        <label>
          <input type="checkbox" checked={done} onChange={() => setItem(`tryit:${id}`, !done)} />{' '}
          我在终端跑过了
        </label>
        <button type="button" onClick={copy}>
          复制命令
        </button>
      </div>
    </div>
  );
}
