import type { ShowSummary } from '../../../_discover/data/summaries';
import type { TileShow } from '../../../_discover/data/tileShow';
import { formatCount, formatSeasons } from '../../../_discover/landing/format';
import { decadeKicker, decadeReason } from './reason';
import { layoutTreemap, type TreemapCell, voteBars } from './treemap';

/** The decade's eleven most-rated shows */
export const LANDSCAPE_SIZE = 11;

/** One show of the landscape: its tile, its phone row and its card */
export type LandscapeShow = Readonly<{
  id: number;
  slug: string;
  title: string;
  backdrop: string | null;
  /** "24,000" (the phone's count; the tile adds "votes") */
  votes: string;
  cell: TreemapCell;
  /** the phone row's bar, percent of the first show's votes */
  bar: number;
  kicker: string;
  reason: string;
  year: number | null;
  network: string | null;
  /** "8 seasons", "5 episodes" */
  length: string | null;
}>;

/**
 * The landscape's view model, trimmed to what the client island draws: the
 * treemap layout (on the server, so the client does no layout work), the
 * phone's bars, and each card's kicker, meta and reason.
 */
export function buildLandscape(
  shows: ReadonlyArray<TileShow>,
  summaries: Readonly<Record<number, ShowSummary>>,
): ReadonlyArray<LandscapeShow> {
  const top = shows.slice(0, LANDSCAPE_SIZE);
  const counts = top.map((show) => show.voteCount);
  const cells = layoutTreemap(counts);
  const bars = voteBars(counts);
  return top.flatMap((show, index) => {
    const cell = cells[index];
    if (!cell) {
      return [];
    }
    const summary = summaries[show.id];
    const rank = index + 1;
    return [
      {
        backdrop: show.backdrop,
        bar: bars[index] ?? 0,
        cell,
        id: show.id,
        kicker: decadeKicker(rank),
        length: summary
          ? formatSeasons(summary.seasons, summary.episodes)
          : null,
        network: summary?.network ?? null,
        reason: decadeReason({
          episodes: summary?.episodes ?? 0,
          lastAirYear: summary?.lastAirYear ?? null,
          rank,
          seasons: summary?.seasons ?? 0,
          status: summary?.status ?? null,
        }),
        slug: show.slug,
        title: show.title,
        votes: formatCount(show.voteCount),
        year: show.year,
      },
    ];
  });
}
