import 'server-only';

import getBaseUrl from '@/lib/getBaseUrl';
import { loadSeriesOrNull } from '@/lib/series/loaders';

import { loadPlexStatus } from '../../_data/plex';
import { getSettingsViewer } from '../../_data/session';
import { scrobbleMarks } from '../_lib/scrobbleMarks';
import { webhookUrlPrefix } from '../_lib/webhookUrl';
import LastScrobble, { type LastShow } from './LastScrobble';
import PlexPanel from './PlexPanel';
import { ScrobbleWeek, WeekMarks } from './ScrobbleWeek';
import WeekBars from './WeekBars';

/** The show behind the last scrobble: public, cached; a miss just drops the backdrop. */
async function loadLastShow(
  seriesId: number,
  title: string,
): Promise<LastShow> {
  const series = await loadSeriesOrNull(seriesId);
  return {
    backdrop: series?.backdropImage ?? null,
    logo: series?.titleTreatmentImage ?? null,
    title: series?.title ?? title,
  };
}

/**
 * The Plex card's hole: the viewer's status and the last show's backdrop.
 * Never the webhook token: it is a bearer secret, fetched only when the
 * viewer presses Show or Copy (`revealPlexUrl`). Per user and never cached.
 * A failed status read throws to the section's error boundary instead of
 * claiming "Not connected".
 */
export default async function PlexCard() {
  const { accessToken } = await getSettingsViewer();
  const status = await loadPlexStatus(accessToken);
  if (!status) {
    throw new Error('Plex status unavailable');
  }
  const prefix = webhookUrlPrefix(getBaseUrl(), 'plex');
  if (!status.connected) {
    return (
      <PlexPanel
        account={null}
        connected={false}
        hasUrl={false}
        lastReceivedAt={null}
        onlyAccountId={null}
        paused={false}
        prefix={prefix}
        scrobbles={null}
      />
    );
  }

  const latest = status.recent[0];
  const show = latest
    ? await loadLastShow(latest.seriesId, latest.title)
    : null;
  // An API a build behind the web (or a stored answer from before) has no `week`
  const marks = scrobbleMarks(status.recent, status.week ?? []);
  // without the week, bars counted from the latest five would be wrong: none
  const weekBars = status.week ? <WeekBars /> : undefined;
  const scrobbles =
    latest && show ? (
      <ScrobbleWeek latest={status.recent.length} marks={marks}>
        <LastScrobble
          episode={latest.episodeNumber}
          episodeTitle={latest.episodeTitle}
          season={latest.seasonNumber}
          show={show}
          watchedAt={latest.watchedAt}
          week={weekBars}
        />
        <WeekMarks />
      </ScrobbleWeek>
    ) : null;
  const account = status.onlyAccount ?? status.lastAccount;
  const onlyAccountId = status.onlyAccount?.id ?? null;
  return (
    <PlexPanel
      account={account}
      connected
      hasUrl
      lastReceivedAt={status.lastReceivedAt}
      onlyAccountId={onlyAccountId}
      paused={status.paused}
      prefix={prefix}
      recentCount={status.recent.length}
      scrobbles={scrobbles}
      urlWorks={status.urlWorks}
    />
  );
}
