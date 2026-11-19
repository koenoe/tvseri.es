'use client';

import type {
  LIBRARY_LETTERS,
  LibraryFilter,
  LibrarySort,
} from '@tvseri.es/schemas';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { type ShelfQuery, toSearch } from '@/lib/profile/shelfQuery';
import useFindText from './useFindText';

type Letter = (typeof LIBRARY_LETTERS)[number];

/**
 * Sort, find, letter and filter live in the URL: a change stops Select and
 * replaces the URL in a transition (`pending` dims the old grid until the
 * server's new first page lands). Find's text (`find`) is the field's own;
 * every other change carries it as it stands.
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

  const find = useFindText(query.q, (q) => go({ ...query, from: null, q }));
  // A find still pausing goes with the sort or filter, never dropped
  const goWithFind = (patch: Partial<ShelfQuery>) =>
    go({ ...query, from: null, ...patch, q: find.settle() });

  return {
    find,
    onFilter: (filter: LibraryFilter | null) => goWithFind({ with: filter }),
    /** A rail link's click: its href already carries the text */
    onJump: () => void find.settle(),
    onSort: (sort: LibrarySort) => goWithFind({ sort }),
    pending,
    railHref: (letter: Letter) =>
      `${pathname}${toSearch({ ...query, from: letter, q: find.text.trim(), sort: 'az' })}`,
  };
}
