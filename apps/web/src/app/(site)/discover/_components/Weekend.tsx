import { formatRuntime } from '@tvseri.es/utils';
import Image from 'next/image';
import type { DurationTileShow } from '@/app/(site)/_discover/data/duration';
import ButtonContent from '@/components/ui/button/ButtonContent';
import { FLAT } from '@/components/ui/ghost/ghosts';
import {
  arrowRightGlyph,
  calendarGlyph,
  clockGlyph,
  seasonGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { SectionError } from '@/components/ui/row/RowError';
import { GHOST_LOOK, GhostLine } from '@/components/ui/row/RowGhosts';
import RowHeader from '@/components/ui/row/RowHeader';
import { HUB_TILE_SHADOW } from '@/components/ui/row/rowLayout';
import PosterTile from '@/components/ui/tile/PosterTile';
import TileLink from '@/components/ui/tile/TileLink';
import { TILE_HOVER_WIDE } from '@/components/ui/tile/tileHover';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import { plural } from '@/lib/format/text';
import showPath from '@/lib/routing/showPath';
import { durationRowKey } from '../_data/lensModel';
import { getWeekendShows } from '../_data/weekend';
import { HUB_SECTION_HEAD, OPEN_LENS_ROW_BUTTON } from './hubSectionHead';
import OpenLensRowButton from './OpenLensRowButton';

export const WEEKEND_ID = 'weekend';
export const WEEKEND_TITLE = 'Finish it this weekend';

const WEEKEND_ACTION = 'Under 6 hours';

/** The action's flat ghost: the heading line is the button's height on a phone too */
const ACTION_GHOST = (
  <span aria-hidden className={cn(OPEN_LENS_ROW_BUTTON, FLAT)}>
    <ButtonContent icon={arrowRightGlyph} iconSize={16}>
      {WEEKEND_ACTION}
    </ButtonContent>
  </span>
);
const WEEKEND_TITLE_ID = `${WEEKEND_ID}-title`;
/** The section, its rail and the tiles' sizes: the placeholder (`WeekendSkeleton`) draws the same frame */
const WEEKEND_SECTION = cn(
  'mx-auto flex w-full max-w-page flex-col gap-6 px-gutter',
  HUB_TILE_SHADOW,
);
const WEEKEND_RAIL =
  '-mx-gutter flex snap-x snap-mandatory scroll-pl-gutter gap-3 overflow-x-auto overscroll-x-contain px-gutter scrollbar-none md:mx-0 md:grid md:grid-cols-5 md:gap-5 md:overflow-visible md:px-0 md:[--tile-radius:10px] [--tile-radius:10px]';
const WEEKEND_WIDE =
  'flex w-66 shrink-0 snap-start flex-col gap-2 md:col-span-2 md:w-auto md:gap-3';
const WEEKEND_POSTER = 'w-33 shrink-0 snap-start md:w-auto';
/** The wide tile's backdrop link: the one backdrop hover (`tileHover`), no lift or ring */
const WIDE_LINK = `relative block h-49.5 overflow-hidden rounded-10 bg-white/5 shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(221_238_255/0.08)] focus-visible:outline-offset-4 md:h-85 ${TILE_HOVER_WIDE}`;

/**
 * The line under each tile: the title, then the facts (24 + 10 + 20). The
 * full facts need a 1280px page (the hub's columns); narrower, a tile
 * shows the length alone, as a phone does, so nothing runs
 * past its column at a tablet.
 */
const WEEKEND_LINE = 'flex min-w-0 flex-col gap-2.5';
const WEEKEND_WIDE_GHOST = cn(
  'block h-49.5 rounded-10 md:h-85',
  GHOST_LOOK.loading,
);
const WEEKEND_POSTER_GHOST = cn(
  'block aspect-2/3 rounded-10',
  GHOST_LOOK.loading,
);

function ShowLine({ show }: Readonly<{ show: DurationTileShow }>) {
  return (
    <div className={WEEKEND_LINE}>
      <span className="truncate text-body-sm font-semibold">{show.title}</span>
      <MetaRow className="gap-3 text-caption max-xl:hidden" fit="drop">
        <MetaItem icon={seasonGlyph} iconSize={12}>
          {plural(show.episodes, 'episode')}
        </MetaItem>
        <MetaItem icon={calendarGlyph} iconSize={12}>
          {show.year ?? ''}
        </MetaItem>
        <MetaItem icon={clockGlyph} iconSize={12} tone="highlight">
          {formatRuntime(show.minutes)}
        </MetaItem>
      </MetaRow>
      <MetaRow className="gap-3 text-caption xl:hidden">
        <MetaItem icon={clockGlyph} iconSize={12} tone="highlight">
          {formatRuntime(show.minutes)}
        </MetaItem>
      </MetaRow>
    </div>
  );
}

function WideTile({ show }: Readonly<{ show: DurationTileShow }>) {
  const label = `${show.title}, ${formatRuntime(show.minutes) ?? ''}`;
  const image = show.backdrop ?? show.poster;
  return (
    <div className={WEEKEND_WIDE}>
      <TileLink
        aria-label={label}
        className={WIDE_LINK}
        href={showPath(show.id, show.slug)}
      >
        {image ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(min-width: 768px) 474px, 264px"
            src={image}
          />
        ) : null}
        <span className="absolute top-2.5 left-2.5 z-2">
          <WatchedOverlay id={show.id} />
        </span>
      </TileLink>
      <ShowLine show={show} />
    </div>
  );
}

function TileLine() {
  return (
    <span className={WEEKEND_LINE}>
      <GhostLine className="h-6" look="loading" width="w-3/4" />
      <GhostLine className="h-5" look="loading" width="w-1/2" />
    </span>
  );
}

/** Finish it this weekend: the title is static, the wide tile and three posters follow with their lines */
export function WeekendSkeleton() {
  return (
    <section
      aria-busy
      aria-hidden
      className={WEEKEND_SECTION}
      data-placeholder="weekend"
    >
      <div className={HUB_SECTION_HEAD}>
        <RowHeader
          actions={ACTION_GHOST}
          title={WEEKEND_TITLE}
          titleId="weekend-loading"
        />
      </div>
      <div className={WEEKEND_RAIL}>
        <div className={WEEKEND_WIDE}>
          <span className={WEEKEND_WIDE_GHOST} />
          <TileLine />
        </div>
        {[0, 1, 2].map((slot) => (
          <div className={WEEKEND_POSTER} key={slot}>
            <div className="flex flex-col gap-2 md:gap-3">
              <span className={WEEKEND_POSTER_GHOST} />
              <TileLine />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Finish it this weekend: ended shows under 6 hours, the
 * first one wide on its backdrop, then three posters, each with episodes,
 * year and total length. Phones swipe them.
 */
export default async function Weekend() {
  const shows = await getWeekendShows();
  if (isUnavailable(shows)) {
    const weekendPlaceholder = <WeekendSkeleton />;
    // at its placeholder's size (a wide tile and three posters with their
    // lines), not a poster row's: the page below doesn't move
    return (
      <SectionError
        placeholder={weekendPlaceholder}
        state="unavailable"
        title={WEEKEND_TITLE}
      />
    );
  }
  const [first, ...rest] = shows;
  if (!first) {
    return null;
  }
  const action = (
    <OpenLensRowButton lens="duration" row={durationRowKey('under-6-hours')}>
      {WEEKEND_ACTION}
    </OpenLensRowButton>
  );
  return (
    <section
      aria-labelledby={WEEKEND_TITLE_ID}
      className={WEEKEND_SECTION}
      data-slot="weekend"
    >
      <div className={HUB_SECTION_HEAD}>
        <RowHeader
          actions={action}
          title={WEEKEND_TITLE}
          titleId={WEEKEND_TITLE_ID}
        />
      </div>
      <div className={WEEKEND_RAIL}>
        <WideTile show={first} />
        {rest.map((show) => (
          <div className={WEEKEND_POSTER} key={show.id}>
            <PosterTile
              id={show.id}
              label={`${show.title}, ${formatRuntime(show.minutes) ?? ''}`}
              overlay={<WatchedOverlay id={show.id} />}
              poster={show.poster}
              sizes="(min-width: 768px) 227px, 132px"
              slug={show.slug}
              title={show.title}
            >
              <ShowLine show={show} />
            </PosterTile>
          </div>
        ))}
      </div>
    </section>
  );
}
