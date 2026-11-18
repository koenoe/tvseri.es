import { type AlmostDoneItem, parseEpisodeCode } from '@tvseri.es/schemas';
import { formatRuntime } from '@tvseri.es/utils';
import Image from 'next/image';

import LaneRow from '@/components/lane-row/LaneRow';
import { clockGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import showPath from '@/lib/routing/showPath';

import ToggleEye from '../../blocks/ToggleEye';
import {
  FINISH_WORDS,
  finishLabel,
  progressLabel,
  seasonSegments,
  toGoLabel,
} from './almostDoneCopy';
import { ALMOST_DONE_POSTER_FRAME, ALMOST_DONE_ROW } from './almostDoneLayout';

/**
 * One season near its end, on the shared lane row: poster and title open
 * the show, "1 to go", the segments, the code and the time to finish, the
 * profile's toggling eye.
 */
export default function AlmostDoneRow({
  item,
}: Readonly<{ item: AlmostDoneItem }>) {
  const { segments, total, watched } = seasonSegments(item);
  const progress = { label: progressLabel(watched, total), segments };
  const time = formatRuntime(item.timeLeftMinutes);
  const episode = parseEpisodeCode(item.code)?.episodeNumber ?? 1;
  const poster = (
    <span className={ALMOST_DONE_POSTER_FRAME}>
      {item.posterImage ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="48px"
          src={item.posterImage}
        />
      ) : null}
    </span>
  );
  // One line; "to finish the season" ends with an ellipsis first, the time
  // is never cut (it drops whole if it can't fit). On a phone the title has
  // its line to itself: "1 to go" joins this line and the time goes without
  // its words. The group is never narrower than the clock and the time (the
  // words are 0 wide at least), so on a narrow line it drops whole.
  const facts = time ? (
    <span
      className="flex flex-1 items-center gap-1.5"
      title={finishLabel(item.timeLeftMinutes) ?? undefined}
    >
      <Icon className="shrink-0" glyph={clockGlyph} size={12} />
      <span className="flex flex-1">
        <span className="shrink-0 tabular-nums">{time}</span>
        <span className="w-0 min-w-0 flex-1 truncate max-md:hidden">
          &nbsp;{FINISH_WORDS}
        </span>
      </span>
    </span>
  ) : null;
  const eye = (
    <ToggleEye
      code={item.code}
      episode={episode}
      season={item.season}
      seriesId={item.seriesId}
      title={item.title}
    />
  );
  return (
    <LaneRow
      code={item.code}
      count={toGoLabel(item.toGo)}
      end={eye}
      facts={facts}
      href={showPath(item.seriesId, item.slug)}
      layout={ALMOST_DONE_ROW}
      poster={poster}
      progress={progress}
      title={item.title}
    />
  );
}
