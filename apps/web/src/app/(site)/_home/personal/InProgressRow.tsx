import type { UpNextItem } from '@tvseri.es/schemas';
import Image from 'next/image';
import { memo } from 'react';

import LaneRow from '@/components/lane-row/LaneRow';
import { clockGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import { formatDuration } from '@/lib/format/duration';
import {
  IN_PROGRESS_ROW,
  LANE_EYE,
  LANE_POSTER,
  LANE_POSTER_EMPTY,
} from './continueLayout';
import { finishLine } from './format';
import MarkEye from './MarkEye';

/**
 * A compact In progress row on the shared lane row:
 * poster, title and "2 to go", one segment per episode of the season (one
 * line past 30), the episode pill and the time to finish the season ("2h to
 * finish" on the phone), Home's one-way eye. As drawn, the row itself isn't
 * a link: the eye is its action. Memoised, as the Up next tile: a row
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
  const eye = (
    <MarkEye
      className={LANE_EYE}
      code={item.code}
      episode={item.episode}
      episodeTitle={item.episodeTitle}
      season={item.season}
      seriesId={item.seriesId}
      title={item.title}
    />
  );
  return (
    <LaneRow
      className={className}
      code={item.code}
      count={`${item.toWatch} to go`}
      end={eye}
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
