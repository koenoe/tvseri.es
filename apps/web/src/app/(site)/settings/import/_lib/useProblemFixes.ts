import { plural } from '@tvseri.es/utils';

import type {
  EpisodeOption,
  ImportRow,
  SeriesCandidate,
} from '@/lib/import/contract';
import type { SearchShow } from '@/lib/search/searchView';
import type { PickedFix } from '../../_components/problems/fix';
import type { NotFoundHandlers } from '../../_components/problems/NotFoundItem';
import {
  type ProblemItem,
  pickedEpisodeLabel,
  pickedSeriesLabel,
  seriesLabel,
} from '../../_components/problems/problems';
import type { ImportStep } from './importState';
import type { Importer } from './useImporter';

const picked = (label: string, rows: number): PickedFix => ({
  imported: rows,
  kind: 'picked',
  label,
  rows,
  status: 'waiting',
});

/**
 * What a problem item's buttons do: pick a series, a show or an episode and
 * its rows come in, retry, skip or undo, each through the importer with its
 * toast.
 */
export function useProblemFixes(importer: Importer, state: ImportStep) {
  const { prepared } = state;

  const rowsFor = (
    item: ProblemItem,
    extra: Partial<ImportRow>,
  ): ReadonlyArray<ImportRow> =>
    item.indexes.flatMap((index) => {
      const row = prepared.rows[index];
      return row ? [{ ...row, ...extra }] : [];
    });

  const pickSeries = (item: ProblemItem, seriesId: number, label: string) => {
    const rows = rowsFor(item, { seriesId });
    importer.pick({
      fix: picked(label, rows.length),
      key: item.key,
      rows,
      toast: `Imported ${plural(rows.length, 'episode')} of ${label}`,
    });
  };
  const onPickCandidate = (item: ProblemItem, candidate: SeriesCandidate) =>
    pickSeries(item, candidate.id, pickedSeriesLabel(item, candidate));
  const skipItem = (item: ProblemItem) =>
    importer.skip({
      keys: [item.key],
      rows: item.indexes.length,
      toast: `Skipped ${item.kind === 'series-not-found' ? item.query : item.title}`,
    });

  const handlers: NotFoundHandlers = {
    onPickEpisode: (item: ProblemItem, episode: EpisodeOption) => {
      const series = item.series;
      if (!series) {
        return;
      }
      const label = pickedEpisodeLabel(series, episode);
      const rows = rowsFor(item, {
        episodeNumber: episode.episodeNumber,
        seasonNumber: episode.seasonNumber,
        seriesId: series.id,
      });
      importer.pick({
        fix: picked(label, rows.length),
        key: item.key,
        rows,
        toast: `Imported ${label}`,
      });
    },
    onPickShow: (item: ProblemItem, show: SearchShow) =>
      pickSeries(item, show.id, seriesLabel(show.title, show.releaseYear)),
    onRetry: (item: ProblemItem) => {
      const rows = rowsFor(item, {});
      importer.pick({
        fix: picked(item.title, rows.length),
        key: item.key,
        rows,
        toast: `Imported ${item.title}`,
      });
    },
    onSkip: skipItem,
    onUndo: importer.clearFix,
  };

  return { handlers, onPickCandidate, skipItem };
}
