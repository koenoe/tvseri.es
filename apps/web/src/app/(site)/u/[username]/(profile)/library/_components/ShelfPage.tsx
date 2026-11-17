import type { LibraryShelf } from '@tvseri.es/schemas';
import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';
import { type LibraryRead, loadShelfPage } from '@/lib/profile/shelfPage';
import {
  defaultShelf,
  parseShelfQuery,
  type SearchParams,
  type ShelfQuery,
} from '@/lib/profile/shelfQuery';
import type { ProfileViewer } from '@/lib/profile/user';
import Hole from '../../_components/blocks/Hole';
import SubpageHeader, {
  SUBPAGE_TITLE_ID,
} from '../../_components/subpage/SubpageHeader';
import { libraryRead, settleGuess } from '../../_data/libraryRead';
import {
  getProfile,
  getProfileOrNull,
  type Profile,
  type ProfileParams,
} from '../../_data/profile';
import { loadLibrarySummary } from '../_data/library';
import { SHELVES, seenOnlyLine, visitorDescription } from '../_lib/shelves';
import LibraryView from './LibraryView';
import ShelfCount from './ShelfCount';
import ShelfEmpty, { SeenSuggestions } from './ShelfEmpty';
import ShelfSkeleton from './ShelfSkeleton';

type Props = Readonly<{
  params: ProfileParams;
  searchParams: Promise<SearchParams>;
  /** null: `/library`, the viewer's default shelf */
  shelf: LibraryShelf | null;
}>;

/** The shelf the page shows: its own, or `/library`'s default */
async function resolveShelf(
  read: LibraryRead,
  viewer: ProfileViewer,
  shelf: LibraryShelf | null,
) {
  if (shelf) {
    return shelf;
  }
  const counts = await loadLibrarySummary(read);
  return defaultShelf(viewer, isUnavailable(counts) ? null : counts);
}

/**
 * Day 0 with a few shows marked seen: nothing in progress,
 * on the watchlist or loved yet. Finished then keeps offering the Seen grid.
 */
async function isDayZero(
  profile: Profile,
  read: LibraryRead,
): Promise<boolean> {
  if (profile.viewer !== 'owner') {
    return false;
  }
  const counts = await loadLibrarySummary(read);
  return (
    !isUnavailable(counts) &&
    counts.watching === 0 &&
    counts.watchlist === 0 &&
    counts.favourites === 0
  );
}

const GHOST_COUNT = (
  <span
    className={`inline-block h-3 w-6 rounded-4 align-middle ${GHOST_FILL} ${PULSE}`}
  />
);
const GHOST_LINE = (
  <span
    className={`inline-block h-3 w-96 max-w-full rounded-4 align-middle ${GHOST_FILL} ${PULSE}`}
  />
);

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
function Header({
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
  const count = (
    <Suspense fallback={GHOST_COUNT}>
      <Count params={params} shelf={shelf} />
    </Suspense>
  );
  const description = (
    <OwnerVisitor
      owner={ownerLine ?? meta.description}
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

/** A shelf's first page; the API's 403 and 404 (someone else's Hidden) are the page's 404 */
async function firstPage(read: LibraryRead, query: ShelfQuery) {
  try {
    return await loadShelfPage(read, query);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }
}

/**
 * The shelf to show and its first page, read as `viewer`. `/library` reads
 * its usual default (yours Watching, someone else's Favourites) beside the
 * counts; only day 0's other shelf reads again.
 */
async function shelfAndPage(
  read: LibraryRead,
  viewer: ProfileViewer,
  shelf: LibraryShelf | null,
  params: SearchParams,
) {
  const queryOf = (shown: LibraryShelf) =>
    parseShelfQuery(params, shown, viewer);
  if (shelf) {
    const query = queryOf(shelf);
    return { first: await firstPage(read, query), query, shown: shelf };
  }
  const guess = defaultShelf(viewer, null);
  const [shown, first] = await Promise.all([
    resolveShelf(read, viewer, null),
    firstPage(read, queryOf(guess)),
  ]);
  if (shown === guess) {
    return { first, query: queryOf(guess), shown };
  }
  const query = queryOf(shown);
  return { first: await firstPage(read, query), query, shown };
}

/**
 * The profile and the shelf, read at once: the shelf
 * reads by `@username` with the viewer guessed from the display cookie; a
 * wrong guess (no cookie) reads the shelf again as the profile says.
 */
async function shelfData(
  params: ProfileParams,
  searchParams: Promise<SearchParams>,
  shelf: LibraryShelf | null,
) {
  const [start, search] = await Promise.all([
    libraryRead(params),
    searchParams,
  ]);
  if (!start) {
    // signed out: the profile read answers the 401
    await getProfile(params);
    notFound();
  }
  const readAs = (viewer: ProfileViewer) =>
    shelfAndPage(start.read, viewer, shelf, search);
  const { profile, value } = await settleGuess(
    start.guess,
    getProfile(params),
    readAs(start.guess),
    readAs,
  );
  return { profile, read: start.read, ...value };
}

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
      <Header ownerLine={ownerLine} params={params} shelf={shown} />
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
      {shelf ? <Header params={params} shelf={shelf} /> : null}
      <Hole bare fallback={fallback} title={label}>
        <Body params={params} searchParams={searchParams} shelf={shelf} />
      </Hole>
    </section>
  );
}

/** `/library` before it resolves: the default shelf's header and placeholders */
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
