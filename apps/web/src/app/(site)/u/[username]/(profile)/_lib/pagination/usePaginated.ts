'use client';

import type { Page } from '@tvseri.es/schemas';
import {
  startTransition,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import getHistoryKey from '@/lib/navigation/getHistoryKey';

export type PaginationStatus = 'idle' | 'loading' | 'error' | 'unauthorized';

/** What is loaded: the items, and where the pages below and above them start */
type Loaded<T> = Readonly<{
  items: ReadonlyArray<T>;
  nextCursor: string | null;
  prevCursor: string | null;
}>;

// Module-level so loaded pages survive back/forward (keyed per history
// entry); only the last few lists are kept (six shelves plus History)
const restoredPages = new Map<string, Loaded<unknown>>();
const RESTORED_MAX = 10;

function remember(key: string, loaded: Loaded<unknown>) {
  restoredPages.delete(key);
  restoredPages.set(key, loaded);
  for (const oldest of restoredPages.keys()) {
    if (restoredPages.size <= RESTORED_MAX) {
      break;
    }
    restoredPages.delete(oldest);
  }
}

const isCursor = (value: unknown): value is string | null =>
  typeof value === 'string' || value === null;

function isPage(value: unknown): value is Page<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items) &&
    'nextCursor' in value &&
    isCursor(value.nextCursor)
  );
}

/** An answer's `prevCursor`; one without it has nothing above */
const prevCursorOf = (page: object): string | null =>
  'prevCursor' in page && isCursor(page.prevCursor) ? page.prevCursor : null;

function pageUrl(endpoint: string, param: string, cursor: string) {
  const [pathname, queryString] = endpoint.split('?');
  const searchParams = new URLSearchParams(queryString);
  searchParams.set(param, cursor);
  return `${pathname}?${searchParams.toString()}`;
}

type Direction = 'after' | 'before';

/**
 * Cursor pagination for the profile's lists: an endpoint that speaks `Page<T>` (`?cursor=` in,
 * `{ items, nextCursor }` out), and optionally pages above the first one
 * (`?before=<prevCursor>` in, `{ items, prevCursor }` out, in list order):
 * the Library after an A–Z jump, History after a month jump.
 *
 * - A 401 (session gone) stops both ways with status `unauthorized`; other
 *   failures set `error` (`beforeStatus` for the pages above) and the next
 *   call retries.
 * - `getId` drops duplicates (TMDB can repeat items across pages).
 * - `restoreKey` keeps everything loaded, above and below, across Back
 *   (restored in a layout effect, before paint: `history.state` may lag
 *   during render). Give it the endpoint and the normalised query.
 * - `loadBefore`'s `onPrepend` runs just before the items above are added:
 *   `useScrollAnchor`'s capture, so the list doesn't move under the reader.
 */
export default function usePaginated<T>({
  beforeParam = 'before',
  endpoint,
  getId,
  initialCursor,
  initialItems,
  initialPrevCursor = null,
  restoreKey,
}: Readonly<{
  /** The query parameter that asks for the page above (`before`) */
  beforeParam?: string;
  endpoint: string;
  getId?: (item: T) => string | number;
  initialCursor: Page<T>['nextCursor'];
  initialItems: Page<T>['items'];
  /** The first page's `prevCursor`: null when it is the top of the list */
  initialPrevCursor?: string | null;
  restoreKey?: string;
}>) {
  const storageKey = useRef<string | null>(null);
  const loading = useRef<Record<Direction, boolean>>({
    after: false,
    before: false,
  });
  // Bumped when the server sends a new first page: a late answer for the old one is dropped
  const generation = useRef(0);
  const [loaded, setLoaded] = useState<Loaded<T>>({
    items: initialItems,
    nextCursor: initialCursor,
    prevCursor: initialPrevCursor,
  });
  const [status, setStatus] = useState<PaginationStatus>('idle');
  const [beforeStatus, setBeforeStatus] = useState<PaginationStatus>('idle');
  // The latest commit's list: a page loading one way must not drop one that
  // landed the other way while it was in flight
  const latest = useRef(loaded);
  useLayoutEffect(() => {
    latest.current = loaded;
  }, [loaded]);

  // New server data (router.refresh(), a new sort or jump) replaces what was loaded
  const [seed, setSeed] = useState({
    initialCursor,
    initialItems,
    initialPrevCursor,
  });
  if (
    seed.initialItems !== initialItems ||
    seed.initialCursor !== initialCursor ||
    seed.initialPrevCursor !== initialPrevCursor
  ) {
    setSeed({ initialCursor, initialItems, initialPrevCursor });
    setLoaded({
      items: initialItems,
      nextCursor: initialCursor,
      prevCursor: initialPrevCursor,
    });
    generation.current += 1;
  }

  useLayoutEffect(() => {
    if (!restoreKey) {
      storageKey.current = null;
      return;
    }
    const key = `${restoreKey}:${getHistoryKey()}`;
    storageKey.current = key;
    // Only this hook writes entries for this key, so T matches
    const restored = restoredPages.get(key) as Loaded<T> | undefined;
    if (restored) {
      setLoaded(restored);
    }
  }, [restoreKey]);

  // `loaded` too, though it reads `latest`: a new page gives a new
  // `loadMore`, which re-arms InfiniteScroll's sentinel while it is in view
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const load = useCallback(
    async (direction: Direction, onPrepend?: () => void) => {
      const cursor =
        direction === 'after'
          ? latest.current.nextCursor
          : latest.current.prevCursor;
      if (!cursor || loading.current[direction]) {
        return;
      }
      const setFor = direction === 'after' ? setStatus : setBeforeStatus;
      loading.current[direction] = true;
      setFor('loading');
      const started = generation.current;
      try {
        const param = direction === 'after' ? 'cursor' : beforeParam;
        const response = await fetch(pageUrl(endpoint, param, cursor));
        if (response.status === 401) {
          setStatus('unauthorized');
          setBeforeStatus('unauthorized');
          return;
        }
        const result: unknown = response.ok ? await response.json() : null;
        if (started !== generation.current) {
          // an answer for a list the server has since replaced
          setFor('idle');
          return;
        }
        if (!isPage(result)) {
          setFor('error');
          return;
        }
        const added = result.items as ReadonlyArray<T>;
        const current = latest.current;
        const merged =
          direction === 'after'
            ? [...current.items, ...added]
            : [...added, ...current.items];
        const items = getId
          ? [...new Map(merged.map((item) => [getId(item), item])).values()]
          : merged;
        // An empty page shouldn't happen; stop instead of looping
        const empty = added.length === 0;
        const next: Loaded<T> =
          direction === 'after'
            ? {
                items,
                nextCursor: empty ? null : result.nextCursor,
                prevCursor: current.prevCursor,
              }
            : {
                items,
                nextCursor: current.nextCursor,
                prevCursor: empty ? null : prevCursorOf(result),
              };
        if (storageKey.current) {
          remember(storageKey.current, next);
        }
        latest.current = next;
        if (direction === 'before') {
          // A prepend commits at once, in the task that captured the
          // reader's place: a deferred commit could land after a scroll
          onPrepend?.();
          setLoaded(next);
          setFor('idle');
        } else {
          // React does not keep a Transition across an `await`: a page
          // landing below would render at blocking priority while the
          // reader scrolls. It is a Transition again here.
          startTransition(() => {
            setLoaded(next);
            setFor('idle');
          });
        }
      } catch {
        setFor('error');
      } finally {
        loading.current[direction] = false;
      }
    },
    [beforeParam, endpoint, getId, loaded],
  );

  const loadMore = useCallback(() => load('after'), [load]);
  const loadBefore = useCallback(
    (options?: Readonly<{ onPrepend?: () => void }>) =>
      load('before', options?.onPrepend),
    [load],
  );

  const canLoadMore =
    !!loaded.nextCursor && status !== 'error' && status !== 'unauthorized';
  const canLoadBefore = !!loaded.prevCursor && beforeStatus !== 'unauthorized';

  return {
    beforeStatus,
    canLoadBefore,
    canLoadMore,
    items: loaded.items,
    loadBefore,
    loadMore,
    prevCursor: loaded.prevCursor,
    status,
  } as const;
}
