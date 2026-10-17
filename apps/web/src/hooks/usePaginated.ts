import type { Page } from '@tvseri.es/schemas';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import getHistoryKey from '@/utils/getHistoryKey';

export type PaginationStatus = 'idle' | 'loading' | 'error' | 'unauthorized';

// Module-level so loaded pages survive back/forward navigation (keyed per history entry).
const restoredPages = new Map<string, Page<unknown>>();

function isPage(value: unknown): value is Page<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items) &&
    'nextCursor' in value &&
    (typeof value.nextCursor === 'string' || value.nextCursor === null)
  );
}

function buildPageUrl(endpoint: string, cursor: string) {
  const [pathname, queryString] = endpoint.split('?');
  const searchParams = new URLSearchParams(queryString);
  searchParams.set('cursor', cursor);
  return `${pathname}?${searchParams.toString()}`;
}

/**
 * Cursor pagination for "load more" lists backed by an endpoint that speaks `Page<T>`
 * (`?cursor=` in, `{ items, nextCursor }` out).
 *
 * - A 401 (session expired / logged out elsewhere) stops loading with status `unauthorized`.
 * - Other failures set status `error`; calling `loadMore` again retries.
 * - `getId` drops duplicate items (also within a single page).
 * - `restoreKey` keeps loaded pages across back/forward navigation (restored in a layout
 *   effect, because `history.state` may not reflect the current entry during render).
 */
export default function usePaginated<T>({
  endpoint,
  initialItems,
  initialCursor,
  getId,
  restoreKey,
}: Readonly<{
  endpoint: string;
  initialItems: Page<T>['items'];
  initialCursor: Page<T>['nextCursor'];
  getId?: (item: T) => string | number;
  restoreKey?: string;
}>) {
  const storageKeyRef = useRef<string | null>(null);
  const [page, setPage] = useState<Page<T>>({
    items: initialItems,
    nextCursor: initialCursor,
  });

  // Resync when the server sends new data (e.g. after router.refresh()). The
  // props keep their identity across re-renders, so this only fires on change.
  const [seed, setSeed] = useState({ initialCursor, initialItems });
  if (
    seed.initialItems !== initialItems ||
    seed.initialCursor !== initialCursor
  ) {
    setSeed({ initialCursor, initialItems });
    setPage({ items: initialItems, nextCursor: initialCursor });
  }

  useLayoutEffect(() => {
    if (!restoreKey) {
      storageKeyRef.current = null;
      return;
    }

    const storageKey = `${restoreKey}:${getHistoryKey()}`;
    storageKeyRef.current = storageKey;

    // Note: entries are only written by this hook for the same restoreKey, so T matches
    const restored = restoredPages.get(storageKey) as Page<T> | undefined;
    if (restored) {
      setPage(restored);
    }
  }, [restoreKey]);
  const [status, setStatus] = useState<PaginationStatus>('idle');
  const isLoadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!page.nextCursor || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setStatus('loading');

    try {
      const response = await fetch(buildPageUrl(endpoint, page.nextCursor));

      if (response.status === 401) {
        setStatus('unauthorized');
        return;
      }

      const result: unknown = response.ok ? await response.json() : null;
      if (!isPage(result)) {
        setStatus('error');
        return;
      }

      const newItems = result.items as ReadonlyArray<T>;
      const mergedItems = [...page.items, ...newItems];
      const nextPage: Page<T> = {
        // Note: Map keeps the first occurrence's position and the last value for each id
        items: getId
          ? [
              ...new Map(
                mergedItems.map((item) => [getId(item), item]),
              ).values(),
            ]
          : mergedItems,
        // Note: an empty page shouldn't happen, but stop instead of looping
        nextCursor: newItems.length === 0 ? null : result.nextCursor,
      };

      if (storageKeyRef.current) {
        restoredPages.set(storageKeyRef.current, nextPage);
      }
      setPage(nextPage);
      setStatus('idle');
    } catch {
      setStatus('error');
    } finally {
      isLoadingRef.current = false;
    }
  }, [endpoint, getId, page]);

  const canLoadMore =
    !!page.nextCursor && status !== 'error' && status !== 'unauthorized';

  return {
    canLoadMore,
    items: page.items,
    loadMore,
    status,
  };
}
