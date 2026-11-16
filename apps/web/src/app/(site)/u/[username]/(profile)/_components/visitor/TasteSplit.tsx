import type { TasteSplitGenre } from '@tvseri.es/schemas';
import Link from 'next/link';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { chevronRightGlyph, usersGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import landingPath from '@/lib/routing/landingPath';

import type { Profile } from '../../_data/profile';
import EmptyState from '../blocks/EmptyState';
import Lane, { LANE_ROW } from '../blocks/Lane';
import LaneGhost, { GhostRows, LANE_ROW_GHOST } from '../blocks/LaneGhost';
import { loadMatch } from './loadMatch';
import {
  genreSlug,
  type SplitRow,
  type SplitSide,
  theirRow,
  yourRow,
} from './split/splitCopy';

/** The row's two blocks: the genre line, 12px, the comparison */
const SPLIT_LINES_CLASS = 'flex min-w-0 flex-1 flex-col gap-3';

/** The genre (body-sm semibold) with the chevron at the end */
const GENRE_LINE_CLASS =
  'flex items-center justify-between gap-2.5 text-body-sm font-semibold';

/**
 * The comparison's columns: the name (fixed), the bar, the count (at least
 * four digits wide, so both rows' bars end at the same place)
 */
const SIDES_CLASS =
  'grid grid-cols-[5rem_minmax(0,1fr)_minmax(2.5rem,auto)] items-center gap-x-2.5 gap-y-2 text-meta';

/** The bar's 4px track */
const TRACK_CLASS = 'h-1 overflow-hidden rounded-full bg-white/10';

/** One person's line: the name, a bar as long as their share, the count */
function SplitSideLine({ side }: Readonly<{ side: SplitSide }>) {
  const fill = cn(
    'block h-full min-w-1 rounded-full',
    side.lead ? 'bg-white/80' : 'bg-white/35',
  );
  const width = { width: `${side.share * 100}%` };
  return (
    <>
      <span className="min-w-0 truncate text-white/60" title={side.name}>
        {side.name}
      </span>
      <span className={TRACK_CLASS}>
        {side.share > 0 ? <span className={fill} style={width} /> : null}
      </span>
      <span className="text-right text-white/80 tabular-nums">
        {side.count}
      </span>
    </>
  );
}

const ROW_LINK = cn(LANE_ROW, 'transition-colors hover:bg-white/6');

function SplitLink({ row }: Readonly<{ row: SplitRow }>) {
  const [theirs, yours] = row.sides;
  return (
    <Link
      aria-label={row.label}
      className={ROW_LINK}
      href={landingPath('genre', genreSlug(row.genre))}
    >
      <span className={SPLIT_LINES_CLASS}>
        <span className={GENRE_LINE_CLASS}>
          <span className="min-w-0 truncate">{row.genre}</span>
          <Icon
            className="shrink-0 text-white/60"
            glyph={chevronRightGlyph}
            size={13}
          />
        </span>
        <span className={SIDES_CLASS}>
          <SplitSideLine side={theirs} />
          <SplitSideLine side={yours} />
        </span>
      </span>
    </Link>
  );
}

const rowsOf = (
  split: Readonly<{
    theirs: TasteSplitGenre | null;
    yours: TasteSplitGenre | null;
  }>,
  username: string,
): ReadonlyArray<SplitRow> => [
  ...(split.theirs ? [theirRow(split.theirs, username)] : []),
  ...(split.yours ? [yourRow(split.yours, username)] : []),
];

/**
 * Where your tastes split: the genre they watch and you don't,
 * and the one you watch and they don't, each as two bars (theirs, yours)
 * so the difference reads at a glance; the row opens the genre.
 */
export default async function TasteSplit({
  profile,
}: Readonly<{ profile: Profile }>) {
  const { split } = await loadMatch(profile);
  const rows = rowsOf(split, profile.user.username);
  if (rows.length === 0) {
    return (
      <Lane dot="white" hollow id="b-split" title="Where your tastes split">
        <EmptyState
          glyph={usersGlyph}
          sub="Your genres line up so far."
          title="No split yet"
        />
      </Lane>
    );
  }
  return (
    <Lane dot="white" id="b-split" title="Where your tastes split">
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {rows.map((row) => (
          <li key={row.genre}>
            <SplitLink row={row} />
          </li>
        ))}
      </ul>
    </Lane>
  );
}

/** One person's line still to come: the name, the track, the count */
function SideGhost() {
  return (
    <>
      <TextLine className="text-meta" width="w-12" />
      <span className={TRACK_CLASS} />
      <TextLine className="text-meta" width="w-5" />
    </>
  );
}

function SplitRowGhost() {
  return (
    <div className={LANE_ROW_GHOST}>
      <span className={SPLIT_LINES_CLASS}>
        <span className={GENRE_LINE_CLASS}>
          <TextLine className="text-body-sm" width="w-24" />
          <Ghost className="size-[13px] shrink-0 rounded-full" />
        </span>
        <span className={SIDES_CLASS}>
          <SideGhost />
          <SideGhost />
        </span>
      </span>
    </div>
  );
}

/** Where your tastes split's placeholder: the lane with its two rows */
export function TasteSplitSkeleton() {
  return (
    <LaneGhost count={false} title="Where your tastes split">
      <GhostRows className="flex flex-col gap-2.5" count={2}>
        <SplitRowGhost />
      </GhostRows>
    </LaneGhost>
  );
}
