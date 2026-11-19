import type { RecentScrobble } from '@tvseri.es/schemas';
import type { AppBrand } from '../../_lib/services';
import { scrobbleMarks } from '../_lib/scrobbleMarks';
import LastScrobble, { type LastShow } from './LastScrobble';
import { ScrobbleWeek, WeekMarks } from './ScrobbleWeek';
import WeekBars from './WeekBars';

/**
 * A live app card's activity: the latest mark's spotlight with the week's
 * bars, and the list under it. `recent` is the app's newest marks (the
 * spotlight is the first); `show` is that mark's show, loaded by the card.
 */
export default function LiveActivity({
  app,
  heading,
  recent,
  show,
  week,
}: Readonly<{
  app: AppBrand;
  heading?: string;
  recent: ReadonlyArray<RecentScrobble>;
  show: LastShow;
  /** The last 8 days' marks; absent from an API a build behind the web */
  week: ReadonlyArray<RecentScrobble> | undefined;
}>) {
  const latest = recent[0];
  if (!latest) {
    return null;
  }
  const marks = scrobbleMarks(recent, week ?? []);
  // without the week, bars counted from the latest five would be wrong: none
  const weekBars = week ? <WeekBars /> : undefined;
  return (
    <ScrobbleWeek app={app} latest={recent.length} marks={marks}>
      <LastScrobble
        episode={latest.episodeNumber}
        episodeTitle={latest.episodeTitle}
        heading={heading}
        season={latest.seasonNumber}
        show={show}
        watchedAt={latest.watchedAt}
        week={weekBars}
      />
      <WeekMarks />
    </ScrobbleWeek>
  );
}
