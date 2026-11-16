import type { LibraryShelf } from '@tvseri.es/schemas';
import type { Metadata } from 'next';

import { type ProfileParams, profileMetadata } from '../../_data/profile';
import type { SearchParams } from '../_lib/shelfQuery';
import { SHELVES } from '../_lib/shelves';
import ShelfPage from './ShelfPage';

export type ShelfRouteProps = Readonly<{
  params: ProfileParams;
  searchParams: Promise<SearchParams>;
}>;

/**
 * One shelf's route (`library/<shelf>/page.tsx`, static segments so each
 * shelf's title and placeholders are in its own shell): its metadata and
 * its page.
 */
export function shelfRoute(shelf: LibraryShelf) {
  const noun = SHELVES[shelf].label.toLowerCase();
  return {
    generateMetadata: ({ params }: ShelfRouteProps): Promise<Metadata> =>
      profileMetadata(params, (username) => `@${username}’s ${noun}`),
    // biome-ignore lint/correctness/noComponentHookFactories: built once per shelf at module scope of its page.tsx, never during a render
    Page: ({ params, searchParams }: ShelfRouteProps) => (
      <ShelfPage params={params} searchParams={searchParams} shelf={shelf} />
    ),
  };
}
