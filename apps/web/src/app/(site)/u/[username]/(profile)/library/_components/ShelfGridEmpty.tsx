import type { LibraryShelf } from '@tvseri.es/schemas';
import type { ShelfQuery } from '@/lib/profile/shelfQuery';
import EmptyState from '../../_components/blocks/EmptyState';
import { OWNER_EMPTY } from '../_lib/shelfEmpty';
import { SHELVES } from '../_lib/shelves';

/**
 * A shelf's grid with no tiles left on this page: the shelf's own empty
 * state when it is empty now (its last series left), as on a fresh load;
 * otherwise the line for a find or a filter that matches nothing.
 */
export default function ShelfGridEmpty({
  owner,
  query,
  shelf,
  username,
}: Readonly<{
  owner: boolean;
  query: Pick<ShelfQuery, 'q' | 'with'>;
  shelf: LibraryShelf;
  username: string;
}>) {
  const meta = SHELVES[shelf];
  if (!query.q && !query.with) {
    const visitorTitle = `Nothing on ${username}’s ${meta.visitorNoun} yet.`;
    return owner ? (
      <EmptyState
        glyph={OWNER_EMPTY[shelf].glyph}
        sub={OWNER_EMPTY[shelf].sub}
        title={OWNER_EMPTY[shelf].title}
      />
    ) : (
      <EmptyState glyph={meta.glyph} title={visitorTitle} />
    );
  }
  return (
    <p className="py-10 text-center text-body-sm text-white/60">
      {query.q
        ? `Nothing in ${meta.label} starts with “${query.q}”.`
        : 'Nothing here with this filter.'}
    </p>
  );
}
