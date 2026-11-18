import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';
import { getCountries, isUnavailable } from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import { ROW_LIFT } from '../ui/rowLift';
import CountryHighlight from './CountryHighlight';
import { MAP_SIZE, rankCountries } from './model';
import { worldMapSvg } from './worldMapSvg';

/**
 * The map and its country list (shared with the placeholder). The map's
 * column stops at its drawn width (`MAP_SIZE`, 580px) and the list centres
 * in what's left, so it sits balanced between the furthest-east dots (9.4px
 * in from the map's edge, then the 8px gap) and the card's edge (its 18px
 * padding): 44px each side on desktop.
 */
const MAP_ROW =
  'grid grid-cols-[minmax(0,580px)_minmax(176px,1fr)] items-center gap-2';
/** The list's box, a fixed width centred in its column */
const LIST_BOX = 'w-44 justify-self-center';

const LISTED = 6;

const LIST_CLASS = cn('flex flex-col', LIST_BOX);

/** A country's row, inset and lifted as Stats' list rows are (`ROW_LIFT`) */
const COUNTRY_ROW = cn(
  'flex justify-between gap-3 border-white/6 border-t py-2 text-body-sm',
  ROW_LIFT,
);
/** The list's foot and the placeholder's lines, at the rows' inset */
const LIST_INSET = 'px-1.5';
const MORE = cn('pt-2 text-caption text-white/60', LIST_INSET);
const COUNTRY_GHOSTS_CLASS = cn(
  'flex flex-col justify-center gap-2',
  LIST_BOX,
  LIST_INSET,
);

/**
 * "Where the series are from" (the phone leaves it
 * out): the dotted world map with the year's countries lit by how many
 * series came from each, and the top six beside it.
 */
export default async function WhereFrom({ user, year }: SectionProps) {
  const countries = await getCountries(user.id, year);
  if (isUnavailable(countries)) {
    return (
      <StatsUnavailable
        placeholder={<WhereFromSkeleton />}
        title={'Where the series are from'}
      />
    );
  }
  const ranked = rankCountries(countries);
  if (ranked.length === 0) {
    return null;
  }
  const map = worldMapSvg({
    countries: ranked,
    hoverClassName:
      'transition-[stroke] duration-150 hover:stroke-white data-active:stroke-white',
    label: `Countries the ${year} series come from`,
  });
  const listed = ranked.slice(0, LISTED);
  const more = ranked.length - listed.length;
  return (
    <Lane
      badge={ranked.length}
      id="stats-map-title"
      title="Where the series are from"
    >
      <CountryHighlight className={MAP_ROW}>
        <div>{map}</div>
        <div className={LIST_CLASS}>
          <ul className="flex flex-col">
            {listed.map((country) => {
              const code = country.code ?? undefined;
              return (
                <li
                  className={COUNTRY_ROW}
                  data-country={code}
                  key={country.name}
                >
                  <span className="text-white/80">{country.name}</span>
                  <span className="text-white/60 tabular-nums">
                    {country.count}
                  </span>
                </li>
              );
            })}
          </ul>
          {more > 0 ? <span className={MORE}>{`and ${more} more`}</span> : null}
        </div>
      </CountryHighlight>
    </Lane>
  );
}

/** The country list beside the map */
const COUNTRY_GHOSTS = Array.from({ length: 6 }, (_, n) => n);

/** The map's box: its own width at most, scaled down with its column, at its ratio */
const MAP_GHOST_STYLE = {
  aspectRatio: `${MAP_SIZE.width} / ${MAP_SIZE.height}`,
  maxWidth: MAP_SIZE.width,
} as const;

/**
 * The lane at its drawn size: head 24, gap 16, then the map row in the
 * lane's own grid, so the row is the map's height at every width (358px
 * where the map has its full width, less where its column is narrower)
 */
export function WhereFromSkeleton() {
  return (
    <LaneGhost title="Where the series are from">
      <div className={MAP_ROW}>
        <Ghost className="w-full rounded-12" style={MAP_GHOST_STYLE} />
        <span className={COUNTRY_GHOSTS_CLASS}>
          {COUNTRY_GHOSTS.map((n) => (
            <TextLine className="text-body-sm" key={n} width="w-full" />
          ))}
        </span>
      </div>
    </LaneGhost>
  );
}
