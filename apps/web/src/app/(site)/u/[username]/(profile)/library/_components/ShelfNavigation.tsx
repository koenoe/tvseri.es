import { LIBRARY_SHELVES, type LibraryShelf } from '@tvseri.es/schemas';
import { Fragment, Suspense } from 'react';

import { FLAT, PULSE } from '@/components/ui/ghost/ghosts';
import Icon from '@/components/ui/icon/Icon';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import BlockError from '../../_components/blocks/BlockError';
import SidebarRule from '../../_components/shell/SidebarRule';
import { getProfile, type ProfileParams } from '../../_data/profile';
import { loadLibrarySummary } from '../_data/library';
import { libraryRead } from '../_data/read';
import { defaultShelf } from '../_lib/shelfQuery';
import { SHELVES } from '../_lib/shelves';
import { ShelfChips, ShelfNav } from './ShelfLinks';
import { NavRule, ROW, ShelvesHeading } from './shelfNavParts';

type Props = Readonly<{ params: ProfileParams }>;

/**
 * What the nav and the chips need: the profile and the shared summary read,
 * which starts at once beside it (by `@username`, deduped per render)
 */
async function shelfLinks(params: ProfileParams) {
  const counted = libraryRead(params).then((start) =>
    start ? loadLibrarySummary(start.read) : null,
  );
  const [profile, summary] = await Promise.all([getProfile(params), counted]);
  const counts = summary === null || isUnavailable(summary) ? null : summary;
  const owner = profile.viewer === 'owner';
  return {
    counts,
    defaultShelf: defaultShelf(profile.viewer, counts),
    owner,
    username: profile.user.username,
  } as const;
}

async function Nav({ params }: Props) {
  const links = await shelfLinks(params);
  return <ShelfNav {...links} />;
}

async function Chips({ params }: Props) {
  const links = await shelfLinks(params);
  return <ShelfChips {...links} />;
}

const OWNER_ROWS = LIBRARY_SHELVES;
/** A shelf's count still to come */
const COUNT_GHOST = cn('ml-auto h-3 w-6 rounded-4', GHOST_FILL, PULSE);
const VISITOR_ROWS = LIBRARY_SHELVES.filter((shelf) => shelf !== 'hidden');

function GhostRows({
  shelves,
}: Readonly<{ shelves: ReadonlyArray<LibraryShelf> }>) {
  return shelves.map((shelf) => (
    <Fragment key={shelf}>
      {shelf === 'all' ? <NavRule /> : null}
      <span className={cn(ROW, 'text-white/80')}>
        <Icon
          className="text-white/60"
          glyph={SHELVES[shelf].glyph}
          size={16}
        />
        {SHELVES[shelf].label}
        <span className={COUNT_GHOST} />
      </span>
    </Fragment>
  ));
}

/** The nav before the counts land: its rows with ghost counts (owner 6, visitor 5) */
function NavSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-0.5"
      data-placeholder="shelf-nav"
    >
      <ShelvesHeading />
      <OwnerVisitor
        owner={<GhostRows shelves={OWNER_ROWS} />}
        visitor={<GhostRows shelves={VISITOR_ROWS} />}
      />
    </div>
  );
}

/**
 * The Library's sidebar under the identity (from `lg`): a rule,
 * then the shelves. Below `lg` (no sidebar) the chips sit under the tabs.
 */
export function ShelfAside({ params }: Props) {
  return (
    <div className="-mt-2 flex flex-col gap-7 max-lg:hidden">
      <SidebarRule />
      <BlockError fallback={<NavSkeleton />} title="Shelves">
        <Suspense fallback={<NavSkeleton />}>
          <div data-slot="shelf-nav">
            <Nav params={params} />
          </div>
        </Suspense>
      </BlockError>
    </div>
  );
}

/** A shelf chip as a flat pill its unseen label and count size (no real-looking controls in a skeleton) */
const CHIP_GHOST = cn(
  'inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] leading-5 font-medium',
  FLAT,
);

function ChipGhosts({
  shelves,
}: Readonly<{ shelves: ReadonlyArray<LibraryShelf> }>) {
  return shelves.map((shelf) => (
    <span className={CHIP_GHOST} key={shelf}>
      {SHELVES[shelf].chip}
      <span className="ml-1.5 w-5" />
    </span>
  ));
}

/** The shelf chips under the tabs below `lg` (no sidebar); one row, so nothing moves when they land */
export function ShelfChipRow({ params }: Props) {
  const ghosts = (
    <div aria-hidden="true" data-placeholder="shelf-chips">
      <div className="-mx-gutter flex animate-ghost gap-2 overflow-hidden px-gutter">
        <OwnerVisitor
          owner={<ChipGhosts shelves={OWNER_ROWS} />}
          visitor={<ChipGhosts shelves={VISITOR_ROWS} />}
        />
      </div>
    </div>
  );
  return (
    <div className="lg:hidden">
      <BlockError fallback={ghosts} look="line" title="Shelves">
        <Suspense fallback={ghosts}>
          <div data-slot="shelf-chips">
            <Chips params={params} />
          </div>
        </Suspense>
      </BlockError>
    </div>
  );
}
