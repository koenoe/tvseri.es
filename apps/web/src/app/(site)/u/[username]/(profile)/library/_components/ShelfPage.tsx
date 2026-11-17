import type { LibraryShelf } from '@tvseri.es/schemas';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import type { SearchParams } from '@/lib/profile/shelfQuery';
import Hole from '../../_components/blocks/Hole';
import { SUBPAGE_TITLE_ID } from '../../_components/subpage/SubpageHeader';
import type { ProfileParams } from '../../_data/profile';
import { isDayZero, shelfData } from '../_data/shelf';
import { SHELVES, seenOnlyLine } from '../_lib/shelves';
import LibraryView from './LibraryView';
import ShelfEmpty, { SeenSuggestions } from './ShelfEmpty';
import ShelfHeader, { DefaultSkeleton } from './ShelfHeader';
import ShelfSkeleton from './ShelfSkeleton';

type Props = Readonly<{
  params: ProfileParams;
  searchParams: Promise<SearchParams>;
  /** null: `/library`, the viewer's default shelf */
  shelf: LibraryShelf | null;
}>;

async function Body({ params, searchParams, shelf }: Props) {
  const { first, profile, query, read, shown } = await shelfData(
    params,
    searchParams,
    shelf,
  );
  if (shown === 'hidden' && profile.viewer === 'visitor') {
    notFound();
  }
  const filtered = query.q !== '' || query.with !== null;
  const view: ReactNode =
    first.total === 0 && !filtered ? (
      <ShelfEmpty profile={profile} shelf={shown} />
    ) : (
      <>
        <LibraryView
          first={first}
          owner={profile.viewer === 'owner'}
          query={query}
          username={profile.user.username}
        />
        {shown === 'finished' && (await isDayZero(profile, read)) ? (
          // 32px under the grid (24 on a phone), the section gap and 8
          <div className="mt-2">
            <SeenSuggestions profile={profile} />
          </div>
        ) : null}
      </>
    );
  if (shelf) {
    return view;
  }
  // `/library`: the header names the shelf it resolved to; day 0's Finished
  // says where its shows came from
  const seenOnly =
    profile.viewer === 'owner' &&
    shown === 'finished' &&
    first.total > 0 &&
    first.total === first.items.length &&
    first.items.every((tile) => tile.undated);
  const ownerLine = seenOnly ? seenOnlyLine(first.total) : undefined;
  return (
    <>
      <ShelfHeader ownerLine={ownerLine} params={params} shelf={shown} />
      {view}
    </>
  );
}

const SECTION = 'flex flex-col gap-6 max-md:gap-4';

/**
 * A Library shelf: the header, then the toolbar and the grid,
 * which stream (the session's read) over the shelf's own placeholders.
 * `/library` (`shelf: null`) resolves the viewer's default shelf in the
 * stream; its shell shows yours (Watching) or someone else's (Favourites).
 */
export default function ShelfPage({ params, searchParams, shelf }: Props) {
  const label = shelf ? SHELVES[shelf].label : 'Library';
  const fallback = shelf ? (
    <ShelfSkeleton shelf={shelf} />
  ) : (
    <OwnerVisitor
      owner={<DefaultSkeleton shelf="watching" />}
      visitor={<DefaultSkeleton shelf="favourites" />}
    />
  );
  return (
    <section aria-labelledby={SUBPAGE_TITLE_ID} className={SECTION}>
      {shelf ? <ShelfHeader params={params} shelf={shelf} /> : null}
      <Hole bare fallback={fallback} title={label}>
        <Body params={params} searchParams={searchParams} shelf={shelf} />
      </Hole>
    </section>
  );
}
