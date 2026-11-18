'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, use } from 'react';

type Prefetch = (href: string) => void;

/** Outside the root layout (unit tests) nothing prefetches */
const PrefetchContext = createContext<Prefetch>(() => undefined);

/**
 * The router's `prefetch` for every tile (root layout). Next's `useRouter()`
 * also reads the layout's router context, which changes on every
 * navigation: a tile calling it would re-render with each one (dozens per
 * page, on every `?episode=` step too). Here one component reads it; `prefetch`
 * itself is the same function for the whole session, so the context never
 * changes.
 */
export default function PrefetchProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { prefetch } = useRouter();
  return <PrefetchContext value={prefetch}>{children}</PrefetchContext>;
}

/** Prefetches a route as `router.prefetch` does; for event handlers */
export const usePrefetch = (): Prefetch => use(PrefetchContext);
