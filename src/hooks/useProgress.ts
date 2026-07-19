'use client';

import { useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe, type ProgressStateV2 } from '@/lib/progress-v2';

// 订阅进度 store（useSyncExternalStore；构建期预渲染走 getServerSnapshot 空快照）。
export function useProgress(): ProgressStateV2 {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
