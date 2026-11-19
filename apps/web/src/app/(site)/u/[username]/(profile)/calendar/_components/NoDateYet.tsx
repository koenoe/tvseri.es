import type { Calendar } from '@tvseri.es/schemas';
import { formatGrouped } from '@tvseri.es/utils';

import Badge from '@/components/ui/button/Badge';

import { NO_DATE_PANEL, NO_DATE_TILES } from './calendarStyles';
import NoDateFold from './NoDateFold';
import NoDateTile from './NoDateTile';

export const NO_DATE_TITLE_ID = 'no-date-yet-title';

/** Between the groups: its name in overline type, the count, a hairline */
export function GroupRule({
  count,
  label,
}: Readonly<{ count: number; label: string }>) {
  return (
    <div
      aria-label={`${label}, ${count}`}
      className="flex h-5 items-center gap-2.5 px-0.5"
      role="separator"
    >
      <span
        aria-hidden="true"
        className="shrink-0 text-overline text-white/60 uppercase"
      >
        {label}{' '}
        <b className="text-caption font-medium tracking-normal normal-case">
          {formatGrouped(count)}
        </b>
      </span>
      <i className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/**
 * The renewed shows with no date, under the calendar and never on a day:
 * grouped by what TMDB lists (the next season with its episodes, or only
 * the renewal), each likeliest back first (the API's order). The anchor of
 * the empty month's link and the sidebar's last row.
 */
export default function NoDateYet({
  noDateYet,
}: Readonly<{ noDateYet: Calendar['noDateYet'] }>) {
  const { listed, renewed } = noDateYet;
  const total = listed.length + renewed.length;
  const renewedTiles = renewed.map((item) => (
    <NoDateTile item={item} key={item.seriesId} />
  ));
  return (
    <section
      aria-labelledby={NO_DATE_TITLE_ID}
      className={NO_DATE_PANEL}
      id="no-date-yet"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-title-3" id={NO_DATE_TITLE_ID}>
          No date yet
        </h2>
        <Badge variant="count">{formatGrouped(total)}</Badge>
        <span className="ml-auto text-caption text-white/60 max-md:ml-0 max-md:w-full">
          Renewed, no date announced · likeliest back first
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {listed.length > 0 ? (
          <>
            <GroupRule count={listed.length} label="Next season listed" />
            <div className={NO_DATE_TILES}>
              {listed.map((item) => (
                <NoDateTile item={item} key={item.seriesId} />
              ))}
            </div>
          </>
        ) : null}
        {renewed.length > 0 ? (
          <>
            <GroupRule
              count={renewed.length}
              label="Renewed, nothing listed yet"
            />
            <NoDateFold tiles={renewedTiles} />
          </>
        ) : null}
      </div>
    </section>
  );
}
