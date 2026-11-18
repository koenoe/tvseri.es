import { episodeCode } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

import { formatDay } from '@/lib/format/datePattern';

/** Keeps "10 episodes" and "June 2023" whole when the headline wraps */
const NBSP = '\u00a0';

/** The headline's facts: "10 episodes, June 2023" (either part may be missing) */
export function seasonFacts({
  airDate,
  numberOfEpisodes,
}: Readonly<{ airDate: string; numberOfEpisodes: number }>) {
  const episodes =
    numberOfEpisodes > 0
      ? plural(numberOfEpisodes, 'episode').replace(' ', NBSP)
      : '';
  const month = airDate
    ? formatDay(airDate.slice(0, 10), `MMMM${NBSP}yyyy`)
    : '';
  return [episodes, month].filter(Boolean).join(', ');
}

/** A still's link name: "The Bear S02E01 Beef" */
export function stillLabel({
  episodeNumber,
  seasonNumber,
  seriesTitle,
  title,
}: Readonly<{
  episodeNumber: number;
  seasonNumber: number;
  seriesTitle: string;
  title: string;
}>) {
  const code = episodeCode({ episodeNumber, seasonNumber });
  return [seriesTitle, code, title].filter(Boolean).join(' ');
}
