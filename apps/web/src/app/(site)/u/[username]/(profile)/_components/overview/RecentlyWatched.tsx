import MaxMotion from '@/components/motion/MaxMotion';
import Badge from '@/components/ui/button/Badge';
import { FLAT, Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { historyGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import RowArrows from '@/components/ui/row/RowArrows';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { formatWhen } from '@/lib/format/when';
import { isNewToViewer } from '@/lib/marking/librarySets';
import profilePath from '@/lib/routing/profilePath';
import showPath from '@/lib/routing/showPath';
import { loadViewerLibrary } from '../../_data/library';
import type { Profile } from '../../_data/profile';
import HeadLink from '../blocks/HeadLink';
import { LinkGhost } from '../blocks/LaneGhost';
import { loadRecent } from './recently-watched/loadRecent';
import SingleTile from './recently-watched/SingleTile';
import StackTile from './recently-watched/StackTile';
import { SLOT_WIDTH } from './recently-watched/slotWidth';
import {
  stackWatched,
  type WatchedStack,
} from './recently-watched/stackWatched';
import type { TileData } from './recently-watched/tiles';

const TILES = 5;

/**
 * Five tiles to a row's width whatever the count (a short list never
 * stretches its posters); a spread stack makes it longer than the row, and
 * it scrolls sideways (arrows in the header on desktop, a swipe on a phone)
 */
const TILE_ROW =
  'm-0 flex list-none items-start gap-4 overflow-x-auto scrollbar-none p-0 pt-6';

const RAIL_ID = 'recently-watched-rail';

const GHOST_SLOT = `flex flex-col gap-2.5 ${SLOT_WIDTH}`;

/** The ghost tiles pulse as one row */
const GHOST_ROW = cn(TILE_ROW, PULSE);

/** "Yesterday", "Nov 7"; an episode marked without a date says so */
const dayOf = (watchedAt: number, dateUnknown: boolean, now: number) =>
  dateUnknown ? 'No date' : formatWhen(watchedAt, now);

function toTile(
  stack: WatchedStack,
  index: number,
  now: number,
  isNew: boolean,
): TileData {
  const [newest] = stack.episodes;
  return {
    episodes: stack.episodes.map((episode) => ({
      code: episode.code,
      when: dayOf(episode.watchedAt, episode.dateUnknown, now),
    })),
    href: showPath(stack.seriesId, stack.slug),
    isNew,
    key: `${stack.seriesId}-${index}`,
    poster: stack.poster,
    range: stack.range,
    rangeWhen: newest ? dayOf(newest.watchedAt, newest.dateUnknown, now) : '',
    title: stack.title,
  };
}

/**
 * Recently watched: five posters of your latest episodes, newest first, each
 * with its code and day. Consecutive episodes of one show stack; a click
 * spreads the stack. A visitor also sees which shows are new to them.
 */
export default async function RecentlyWatched({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [items, library] = await Promise.all([
    loadRecent(profile),
    profile.viewer === 'visitor' ? loadViewerLibrary(profile) : null,
  ]);
  const now = Date.now();
  const tiles = stackWatched(items, TILES, profile.viewer === 'visitor').map(
    (stack, index) =>
      toTile(
        stack,
        index,
        now,
        library ? isNewToViewer(library, stack.seriesId) : false,
      ),
  );
  const history = profilePath(profile.user.username, 'history');
  // No dead ends: nothing watched, no History
  const link =
    tiles.length === 0 ? null : (
      <span className="flex shrink-0 items-center gap-4">
        <RowArrows railId={RAIL_ID} title="Recently watched" />
        <HeadLink href={history}>History</HeadLink>
      </span>
    );
  const slots = tiles.map((tile) =>
    tile.episodes.length > 1 ? (
      <StackTile key={tile.key} tile={tile} />
    ) : (
      <SingleTile key={tile.key} tile={tile} />
    ),
  );
  const visitorOf = profile.viewer === 'visitor' ? profile.user.username : null;
  return (
    <section aria-labelledby="recently-watched" className="flex flex-col gap-6">
      <SectionHead id="recently-watched" link={link} title="Recently watched" />
      {slots.length === 0 ? (
        <NothingWatched who={visitorOf} />
      ) : (
        <MaxMotion>
          <ul className={TILE_ROW} id={RAIL_ID}>
            {slots}
          </ul>
        </MaxMotion>
      )}
    </section>
  );
}

/**
 * Five dashed ghosts and one calm line. A visitor reads it
 * about the owner (`who`), never as "your".
 */
function NothingWatched({ who }: Readonly<{ who: string | null }>) {
  const line = who
    ? `Nothing watched yet. ${who}’s latest episodes line up here, newest first.`
    : 'Nothing watched yet. Your latest episodes line up here, newest first.';
  return (
    <div className="flex flex-col gap-6">
      <div aria-hidden="true" className="flex gap-4 overflow-hidden pt-6">
        {Array.from({ length: TILES }, (_, index) => (
          <span
            className="flex min-w-0 flex-col gap-2.5 max-md:shrink-0 max-md:basis-[42%] md:flex-1 md:basis-0"
            key={index}
          >
            <span className="block aspect-2/3 rounded-10 border-2 border-dashed border-white/12 bg-ground" />
            <span className="flex items-center justify-between gap-1.5">
              <span className="h-6 w-14 rounded-6 bg-white/7" />
              <span className="h-2 w-10 rounded-full bg-white/7" />
            </span>
          </span>
        ))}
      </div>
      <p className="m-0 flex items-start gap-2 text-body-sm text-white/60">
        <Icon className="mt-1 shrink-0" glyph={historyGlyph} size={13} />
        <span>{line}</span>
      </p>
    </div>
  );
}

/**
 * The block's placeholder: the real header and five poster-shaped ghosts in
 * the real row, so it is the block's size at every width (a poster's height
 * follows its column; a fixed height can't).
 */
export function RecentlyWatchedSkeleton() {
  const link = <LinkGhost alone width="w-16" />;
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SectionHead
        id="recently-watched-sk"
        link={link}
        title="Recently watched"
      />
      <div className={GHOST_ROW}>
        {Array.from({ length: TILES }, (_, index) => (
          <span className={GHOST_SLOT} key={index}>
            <Ghost className="aspect-2/3 w-full rounded-[var(--tile-radius,12px)]" />
            <span className="flex min-w-0 items-center justify-between gap-1.5">
              <Badge className={FLAT} variant="code" />
              <TextLine className="text-caption" width="w-12" />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
