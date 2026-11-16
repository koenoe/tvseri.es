import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { getCountries, isUnavailable } from '../../_data/loaders';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import StatsUnavailable from '../ui/StatsUnavailable';
import { MAP_SIZE, rankCountries } from './model';
import { worldMapSvg } from './worldMapSvg';

/** The map and its country list (shared with the placeholder) */
const MAP_ROW = 'grid grid-cols-[minmax(0,1fr)_176px] items-center gap-6';

const LISTED = 6;

/**
 * "Where the series are from" (STD_Recommended; the phone board leaves it
 * out): the dotted world map with the year's countries lit by how many
 * series came from each, and the top six beside it.
 */
export default async function WhereFrom({ user, year }: SectionProps) {
  const countries = await getCountries(user.id, year);
  if (isUnavailable(countries)) {
    return (
      <StatsUnavailable
        id="stats-map"
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
    hoverClassName: 'transition-[stroke] duration-150 hover:stroke-white',
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
      <div className={MAP_ROW}>
        <div>{map}</div>
        <div className="flex flex-col">
          {listed.map((country) => (
            <div
              className="flex justify-between gap-3 border-white/6 border-t py-2 text-body-sm"
              key={country.name}
            >
              <span className="text-white/80">{country.name}</span>
              <span className="text-white/60 tabular-nums">
                {country.count}
              </span>
            </div>
          ))}
          {more > 0 ? (
            <span className="pt-2 text-caption text-white/60">{`and ${more} more`}</span>
          ) : null}
        </div>
      </div>
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
        <span className="flex flex-col justify-center gap-2">
          {COUNTRY_GHOSTS.map((n) => (
            <TextLine className="text-body-sm" key={n} width="w-full" />
          ))}
        </span>
      </div>
    </LaneGhost>
  );
}
