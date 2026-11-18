import type { UpNextItem } from '@tvseri.es/schemas';
import { formatDuration } from '@tvseri.es/utils';
import Image from 'next/image';
import { memo } from 'react';

import LaneRow from '@/components/lane-row/LaneRow';
import RowRemote from '@/components/remote/RowRemote';
import { clockGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import cn from '@/lib/cn';

import {
  CONTINUE_REMOTE,
  IN_PROGRESS_ROW,
  LANE_POSTER,
  LANE_POSTER_EMPTY,
  LANE_REMOTE,
} from './continueLayout';
import { finishLine } from './format';

const REMOTE = cn(CONTINUE_REMOTE, LANE_REMOTE);

/**
 * A compact In progress row on the shared lane row:
 * poster, title and "2 to go", one segment per episode of the season (one
 * line past 30), the episode pill and the time to finish the season ("2h to
 * finish" on the phone), the ⋯ Remote (the profile's rows' own). The
 * row itself isn't a link: the ⋯ is its action. Memoised, as the Up next tile: a row
 * re-renders only when its own show moves on.
 */
function InProgressRow({
  className,
  item,
}: Readonly<{ className?: string; item: UpNextItem }>) {
  const segments = Array.from(
    { length: Math.max(item.seasonTotal, 0) },
    (_, n) => n < item.seasonWatched,
  );
  const progress = {
    label: `${item.seasonWatched} of ${item.seasonTotal} episodes watched`,
    segments,
  };
  const finish =
    item.timeLeftMinutes === null ? null : finishLine(item.timeLeftMinutes);
  const short =
    item.timeLeftMinutes === null
      ? ''
      : `${formatDuration(item.timeLeftMinutes)} to finish`;
  const poster = item.posterImage ? (
    <Image
      alt=""
      className={LANE_POSTER}
      height={72}
      sizes="48px"
      src={item.posterImage}
      width={48}
    />
  ) : (
    <span className={LANE_POSTER_EMPTY} />
  );
  const facts = finish ? (
    <MetaItem icon={clockGlyph} iconSize={12} shrink title={finish}>
      {short}
      <span className="max-md:hidden"> the season</span>
    </MetaItem>
  ) : null;
  const remote = (
    <RowRemote
      className={REMOTE}
      season={item.season}
      seriesId={item.seriesId}
      slug={item.slug}
      title={item.title}
    />
  );
  const toGo = `${item.toWatch} to go`;
  return (
    <LaneRow
      className={className}
      code={item.code}
      count={toGo}
      end={remote}
      facts={facts}
      layout={IN_PROGRESS_ROW}
      poster={poster}
      progress={progress}
      title={item.title}
    />
  );
}

const MemoInProgressRow = memo(InProgressRow);
MemoInProgressRow.displayName = 'InProgressRow';

export default MemoInProgressRow;
