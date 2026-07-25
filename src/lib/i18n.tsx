'use client';

// 轻量 i18n：站点只有 zh / en 两个静态语言，不引入外部库。
// 语言选择持久化在 localStorage，初始值 = 已存选择 > 浏览器语言探测（zh* → zh，其余 → en）。

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';

const STORAGE_KEY = 'hermes-tutorial-lang';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: 'zh', setLang: () => {} });

function detectInitialLang(): Lang {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');

  // 挂载后再读取 localStorage / navigator，保证与静态导出的首屏 HTML 一致（无 hydration 闪烁风险）。
  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

// 在 { zh, en } 对之间按当前语言取值。数据文件的平行英文导出配合此函数使用。
export function pick<T>(lang: Lang, pair: { zh: T; en: T }): T {
  return lang === 'en' ? pair.en : pair.zh;
}
