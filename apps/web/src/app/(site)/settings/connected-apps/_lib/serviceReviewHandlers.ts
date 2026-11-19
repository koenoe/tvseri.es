import type { SeriesCandidate } from '@/lib/import/contract';
import type { SearchShow } from '@/lib/search/searchView';

import type { NotFoundHandlers } from '../../_components/problems/NotFoundItem';
import {
  type ProblemItem,
  pickedEpisodeLabel,
  pickedSeriesLabel,
  seriesLabel,
} from '../../_components/problems/problems';
import type { ReviewPick } from './serviceReview';

export type ReviewFixes = Readonly<{
  fix: (item: ProblemItem, pick: ReviewPick, label: string) => void;
  skip: (item: ProblemItem) => void;
}>;

/**
 * What the review items' buttons do: each pick becomes the pick the action
 * matches again, named the way its toast says it ("Top Boy (2019)",
 * "Wednesday S02E01"). A settled item leaves the list, so there is nothing
 * to undo, and a sync's entry never failed a write here, so nothing to retry.
 */
export function reviewHandlers({ fix, skip }: ReviewFixes) {
  const pickCandidate = (item: ProblemItem, candidate: SeriesCandidate) =>
    fix(
      item,
      { kind: 'series', seriesId: candidate.id },
      pickedSeriesLabel(item, candidate),
    );
  const notFound: NotFoundHandlers = {
    onPickEpisode: (item, episode) => {
      if (!item.series) {
        return;
      }
      fix(
        item,
        {
          episodeNumber: episode.episodeNumber,
          kind: 'episode',
          seasonNumber: episode.seasonNumber,
          seriesId: item.series.id,
        },
        pickedEpisodeLabel(item.series, episode),
      );
    },
    onPickShow: (item, show: SearchShow) =>
      fix(
        item,
        { kind: 'series', seriesId: show.id },
        seriesLabel(show.title, show.releaseYear),
      ),
    onSkip: skip,
  };
  return { notFound, pickCandidate };
}
