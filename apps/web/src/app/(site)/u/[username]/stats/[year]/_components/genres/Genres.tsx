import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import { getGenres, isUnavailable } from '../../_data/loaders';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import StatsUnavailable from '../ui/StatsUnavailable';
import { type GenreRow, genreRows, PHONE_ROWS } from './model';

/**
 * "Genres" (STD_Recommended, STMobile): one row per genre with a bar against
 * the top genre (white; the others white/40) and its show count. The phone
 * keeps the top six with narrower columns.
 */
export default async function Genres({ user, year }: SectionProps) {
  const items = await getGenres(user.id, year);
  if (isUnavailable(items)) {
    return (
      <StatsUnavailable
        id="stats-genres"
        placeholder={<GenresSkeleton />}
        title={'Genres'}
      />
    );
  }
  const rows = genreRows(items);
  if (rows.length === 0) {
    return null;
  }
  return (
    <Lane className="max-md:p-4" id="genres-title" title="Genres">
      <ul className="flex flex-col">
        {rows.map((row, index) => (
          <Row hiddenOnPhone={index >= PHONE_ROWS} key={row.name} row={row} />
        ))}
      </ul>
    </Lane>
  );
}

/** A genre's row (`.st-rkr`): name, bar, count; hover lifts the row and whitens the bar */
function Row({
  hiddenOnPhone,
  row,
}: Readonly<{ hiddenOnPhone: boolean; row: GenreRow }>) {
  const style = { width: row.width };
  return (
    <li
      className={cn(
        'group/row grid h-[34px] grid-cols-[132px_minmax(0,1fr)_56px] items-center gap-3.5 rounded-8 px-1.5 [transition:background-color_.15s] hover:bg-white/5 md:grid-cols-[136px_minmax(0,1fr)_72px]',
        hiddenOnPhone && 'max-md:hidden',
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5 text-[14px] text-white/80 leading-6">
        <span className="truncate">{row.name}</span>
      </span>
      <span className="relative h-1 rounded-2 bg-white/6">
        <i
          className={cn(
            'absolute inset-y-0 left-0 rounded-2 [transition:background-color_.15s] group-hover/row:bg-white',
            row.top ? 'bg-white' : 'bg-white/40',
          )}
          style={style}
        />
      </span>
      <span className="whitespace-nowrap text-right text-caption text-white/60 tabular-nums">
        {row.value}
      </span>
    </li>
  );
}

/**
 * The lane's height: padding 36, head 24, 16 and the rows of 34px: nine on
 * desktop (382px), six on a phone with 32px padding (276px).
 */
/** A typical year's genres (the lane lists up to ten) */
const GENRE_GHOSTS = Array.from({ length: 10 }, (_, n) => n);

export function GenresSkeleton() {
  return (
    <LaneGhost
      className="h-[376px] gap-2.5 max-md:h-[270px] max-md:p-4"
      title="Genres"
    >
      {GENRE_GHOSTS.map((n) => (
        <span className="flex h-5 shrink-0 items-center gap-3" key={n}>
          <TextLine className="w-28 text-caption" width="w-20" />
          <Ghost className="h-1 flex-1 rounded-2" />
          <TextLine className="text-caption" width="w-12" />
        </span>
      ))}
    </LaneGhost>
  );
}
