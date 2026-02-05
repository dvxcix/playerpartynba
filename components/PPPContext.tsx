'use client';

import { createContext, useContext, useState } from 'react';

const PPPContext = createContext<{
  pppKeys: Set<string>;
  setPppKeys: (s: Set<string>) => void;
}>({
  pppKeys: new Set(),
  setPppKeys: () => {},
});

export function PPPProvider({ children }: { children: React.ReactNode }) {
  const [pppKeys, setPppKeys] = useState<Set<string>>(new Set());
  return (
    <PPPContext.Provider value={{ pppKeys, setPppKeys }}>
      {children}
    </PPPContext.Provider>
  );
}

export function usePPP() {
  return useContext(PPPContext);
}
