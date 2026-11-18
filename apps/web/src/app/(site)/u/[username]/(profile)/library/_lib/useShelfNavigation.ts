'use client';

import type {
  LIBRARY_LETTERS,
  LibraryFilter,
  LibrarySort,
} from '@tvseri.es/schemas';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { type ShelfQuery, toSearch } from '@/lib/profile/shelfQuery';

type Letter = (typeof LIBRARY_LETTERS)[number];

/**
 * Sort, find, letter and filter live in the URL: a change stops Select and
 * replaces the URL in a transition (`pending` dims the old grid until the
 * server's new first page lands).
 */
export default function useShelfNavigation(
  query: ShelfQuery,
  stopSelecting: () => void,
) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const go = useCallback(
    (next: ShelfQuery) => {
      stopSelecting();
      startTransition(() => {
        router.replace(`${pathname}${toSearch(next)}`, { scroll: false });
      });
    },
    [pathname, router, stopSelecting],
  );

  return {
    onFilter: (filter: LibraryFilter | null) =>
      go({ ...query, from: null, with: filter }),
    onFind: (q: string) => go({ ...query, from: null, q }),
    onSort: (sort: LibrarySort) => go({ ...query, from: null, sort }),
    pending,
    railHref: (letter: Letter) =>
      `${pathname}${toSearch({ ...query, from: letter, sort: 'az' })}`,
  };
}
