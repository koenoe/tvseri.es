'use client';

import { createContext, type ReactNode, use } from 'react';

import type { ShowSummary } from './show';

const ShowContext = createContext<ShowSummary | null>(null);

/** Gives the page's client islands the show summary (see `show.ts`). */
export default function ShowProvider({
  children,
  show,
}: Readonly<{ children: ReactNode; show: ShowSummary }>) {
  return <ShowContext.Provider value={show}>{children}</ShowContext.Provider>;
}

export function useShow(): ShowSummary {
  const show = use(ShowContext);
  if (!show) {
    throw new Error('useShow needs <ShowProvider> (the show page)');
  }
  return show;
}
