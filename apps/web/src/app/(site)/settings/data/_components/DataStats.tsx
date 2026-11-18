import { formatGrouped } from '@tvseri.es/utils';
import type { ReactNode } from 'react';

import {
  loadFirstMarkYear,
  loadRuntimeMinutes,
  loadSettingsCounts,
} from '../../_data/counts';
import { getSettingsViewer } from '../../_data/session';

const DASH = '–';

/** The four tiles' labels, in order: static, so the placeholder shows them */
export const STATS_LABELS = [
  'episodes',
  'shows',
  'hours',
  'your first mark',
] as const;

/** One number and its label (the placeholder passes a bar for the number) */
export function Tile({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="flex flex-col gap-1 rounded-16 bg-white/4 p-6">
      <b className="text-numeral tabular-nums">{value}</b>
      <span className="text-meta text-white/60">{label}</span>
    </div>
  );
}

export const STATS_GRID = 'grid grid-cols-2 gap-4 md:grid-cols-4';

/**
 * The four numbers: episodes, finished shows, hours
 * and the year of your first mark. A number that didn't load is a dash, so
 * the others still show. Per user, never cached.
 */
export default async function DataStats() {
  const { id } = await getSettingsViewer();
  const [counts, minutes, firstYear] = await Promise.all([
    loadSettingsCounts(id),
    loadRuntimeMinutes(id),
    loadFirstMarkYear(id),
  ]);
  const { episodes, shows } = counts;
  return (
    <div className={STATS_GRID}>
      <Tile
        label="episodes"
        value={episodes === null ? DASH : formatGrouped(episodes)}
      />
      <Tile
        label="series"
        value={shows === null ? DASH : formatGrouped(shows)}
      />
      <Tile
        label="hours"
        value={
          minutes === null ? DASH : formatGrouped(Math.round(minutes / 60))
        }
      />
      <Tile
        label="your first mark"
        value={firstYear === null ? DASH : String(firstYear)}
      />
    </div>
  );
}
