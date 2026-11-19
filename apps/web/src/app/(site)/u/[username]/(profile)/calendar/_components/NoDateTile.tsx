import { seasonCode, type WaitingForItem } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

import { clockGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { formatMonthYear } from '@/lib/format/date';
import showPath from '@/lib/routing/showPath';

import LanePoster from '../../_components/blocks/LanePoster';
import { NO_DATE_TILE } from './calendarStyles';

const TILE = cn(
  NO_DATE_TILE,
  'transition-colors duration-100 ease-out hover:bg-white/7',
);

/** What TMDB knows: the listed season and its episodes, or only the renewal */
const factOf = (item: WaitingForItem) =>
  item.listedEpisodes
    ? `${seasonCode(item.nextSeason)} · ${plural(item.listedEpisodes, 'episode')} listed`
    : `Renewed for ${seasonCode(item.nextSeason)}`;

/**
 * A renewed show with no date: its poster, name, the one fact TMDB gives
 * and when it last aired; never an estimate. A link to the show.
 */
export default function NoDateTile({
  item,
}: Readonly<{ item: WaitingForItem }>) {
  const href = showPath(item.seriesId, item.slug);
  return (
    <TileLink className={TILE} href={href}>
      <LanePoster
        className="rounded-6 outline-1 -outline-offset-1 outline-white/10"
        src={item.posterImage}
        width={40}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="truncate text-body-sm leading-[22px] font-semibold"
          title={item.title}
        >
          {item.title}
        </span>
        <span className="truncate text-caption leading-[18px] font-medium text-pink-light">
          {factOf(item)}
        </span>
        {item.lastAired ? (
          <span className="inline-flex items-center gap-[5px] whitespace-nowrap text-caption leading-[18px] text-white/60 tabular-nums">
            <Icon glyph={clockGlyph} size={12} />
            Last aired {formatMonthYear(item.lastAired)}
          </span>
        ) : null}
      </span>
    </TileLink>
  );
}
