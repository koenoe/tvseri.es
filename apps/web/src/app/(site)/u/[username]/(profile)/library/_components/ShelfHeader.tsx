import type { LibraryShelf } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { isUnavailable } from '@/lib/cache/unavailable';
import SubpageHeader from '../../_components/subpage/SubpageHeader';
import { libraryRead } from '../../_data/libraryRead';
import { getProfileOrNull, type ProfileParams } from '../../_data/profile';
import { loadLibrarySummary } from '../_data/library';
import { resolveShelf } from '../_data/shelf';
import { SHELVES, visitorDescription } from '../_lib/shelves';
import ShelfCount from './ShelfCount';
import ShelfSkeleton from './ShelfSkeleton';

const GHOST_COUNT_CLASSES = `inline-block h-3 w-6 rounded-4 align-middle ${GHOST_FILL} ${PULSE}`;
const GHOST_COUNT = <span className={GHOST_COUNT_CLASSES} />;
const GHOST_LINE_CLASSES = `inline-block h-3 w-96 max-w-full rounded-4 align-middle ${GHOST_FILL} ${PULSE}`;
const GHOST_LINE = <span className={GHOST_LINE_CLASSES} />;

async function Count({
  params,
  shelf,
}: Readonly<{ params: ProfileParams; shelf: LibraryShelf | null }>) {
  const start = await libraryRead(params);
  if (!start) {
    return null;
  }
  const [profile, counts] = await Promise.all([
    getProfileOrNull(params),
    loadLibrarySummary(start.read),
  ]);
  if (!profile || isUnavailable(counts)) {
    return null;
  }
  const shown = await resolveShelf(start.read, profile.viewer, shelf);
  return (
    <ShelfCount
      counts={counts}
      shelf={shown}
      username={profile.user.username}
    />
  );
}

async function VisitorLine({
  params,
  shelf,
}: Readonly<{ params: ProfileParams; shelf: LibraryShelf }>) {
  const profile = await getProfileOrNull(params);
  return profile ? visitorDescription(shelf, profile.user.username) : null;
}

/** The shelf's header: the title and the owner's line are static; the count and a visitor's line (it names them) stream */
export default function ShelfHeader({
  ownerLine,
  params,
  shelf,
}: Readonly<{
  /** Replaces the owner's line (day 0's Finished) */
  ownerLine?: string;
  params: ProfileParams;
  shelf: LibraryShelf;
}>) {
  const meta = SHELVES[shelf];
  const ownerDescription = ownerLine ?? meta.description;
  const count = (
    <Suspense fallback={GHOST_COUNT}>
      <Count params={params} shelf={shelf} />
    </Suspense>
  );
  const description = (
    <OwnerVisitor
      owner={ownerDescription}
      visitor={
        <Suspense fallback={GHOST_LINE}>
          <VisitorLine params={params} shelf={shelf} />
        </Suspense>
      }
    />
  );
  return (
    <SubpageHeader count={count} description={description} title={meta.label} />
  );
}

export /** `/library` before it resolves: the default shelf's header and placeholders */
function DefaultSkeleton({ shelf }: Readonly<{ shelf: LibraryShelf }>) {
  const meta = SHELVES[shelf];
  return (
    <>
      <SubpageHeader
        count={GHOST_COUNT}
        description={meta.description}
        title={meta.label}
      />
      <ShelfSkeleton shelf={shelf} />
    </>
  );
}
