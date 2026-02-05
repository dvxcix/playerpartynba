'use client';

import { createContext, useContext, useRef, useState } from 'react';

type PPPContextType = {
  pppKeys: Set<string>;
  setPppKeys: (s: Set<string>) => void;
  pppCount: number;
  setPppCount: (n: number) => void;
  registerRow: (key: string, el: HTMLTableRowElement | null) => void;
  scrollToKey: (key: string) => void;
};

const PPPContext = createContext<PPPContextType>({
  pppKeys: new Set(),
  setPppKeys: () => {},
  pppCount: 0,
  setPppCount: () => {},
  registerRow: () => {},
  scrollToKey: () => {},
});

export function PPPProvider({ children }: { children: React.ReactNode }) {
  const [pppKeys, setPppKeys] = useState<Set<string>>(new Set());
  const [pppCount, setPppCount] = useState(0);

  const rowMap = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const registerRow = (key: string, el: HTMLTableRowElement | null) => {
    if (el) rowMap.current.set(key, el);
  };

  const scrollToKey = (key: string) => {
    const el = rowMap.current.get(key);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ppp-pulse');
    setTimeout(() => el.classList.remove('ppp-pulse'), 1200);
  };

  return (
    <PPPContext.Provider
      value={{
        pppKeys,
        setPppKeys,
        pppCount,
        setPppCount,
        registerRow,
        scrollToKey,
      }}
    >
      {children}
    </PPPContext.Provider>
  );
}

export function usePPP() {
  return useContext(PPPContext);
}
