import type { TvSeries } from '@tvseri.es/schemas';
import { isOver } from '@tvseri.es/utils';

import { plural } from '@/lib/format/text';

import { formatAirDate } from '../episodes/format';

/** "Jun 23, 2022 – Jun 25, 2026", or "Jun 23, 2022 – present" while it runs. */
export function airedRange(
  series: Pick<TvSeries, 'firstAirDate' | 'lastAirDate' | 'status'>,
): string {
  const first = formatAirDate(series.firstAirDate);
  if (!first) {
    return '';
  }
  if (!isOver(series.status)) {
    return `${first} – present`;
  }
  const last = formatAirDate(series.lastAirDate);
  return last && last !== first ? `${first} – ${last}` : first;
}

/** "5 seasons · 47 episodes", then " · 20–70 min" once the runtimes are known. */
export function episodesFact(
  series: Pick<TvSeries, 'numberOfEpisodes' | 'numberOfSeasons'>,
): string {
  return [
    series.numberOfSeasons > 0 ? plural(series.numberOfSeasons, 'season') : '',
    series.numberOfEpisodes > 0
      ? plural(series.numberOfEpisodes, 'episode')
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "20–70 min" or "28 min" over every episode with a runtime; '' without. */
export function runtimeRange(
  runtimes: Readonly<Record<number, ReadonlyArray<number>>>,
): string {
  const values = Object.values(runtimes)
    .flat()
    .filter((value) => value > 0);
  if (values.length === 0) {
    return '';
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min} min` : `${min}–${max} min`;
}
