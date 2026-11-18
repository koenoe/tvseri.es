import { episodeCode, type StatsSpotlightItem } from '@tvseri.es/schemas';

import { formatDuration } from '@tvseri.es/utils';

import showPath from '@/lib/routing/showPath';

import { shortDay } from '@/lib/stats/weeks';

export type SpotlightCard = Readonly<{
  href: string;
  /** The link's name: "The Traitors S01E01" */
  label: string;
  title: string;
  backdrop: string | null;
  logo: string | null;
  code: string;
  episodeTitle: string;
  /** "Sat Jan 4" */
  date: string;
  /** "59m"; null when the runtime is unknown */
  duration: string | null;
}>;

type Item = NonNullable<StatsSpotlightItem>;

export function spotlightCard({
  episode,
  tvSeries,
  watchedAt,
}: Item): SpotlightCard {
  const code = episodeCode(episode);
  return {
    backdrop: tvSeries.backdropImage,
    code,
    date: shortDay(watchedAt),
    duration: episode.runtime > 0 ? formatDuration(episode.runtime) : null,
    episodeTitle: episode.title,
    href: showPath(tvSeries.id, tvSeries.slug),
    label: `${tvSeries.title} ${code}`,
    logo: tvSeries.titleTreatmentImage,
    title: tvSeries.title,
  };
}
