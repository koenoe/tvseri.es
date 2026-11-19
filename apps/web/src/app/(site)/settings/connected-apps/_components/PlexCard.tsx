import 'server-only';

import getBaseUrl from '@/lib/getBaseUrl';
import { loadPlexStatus } from '../../_data/plex';
import { getSettingsViewer } from '../../_data/session';
import { loadLastShow } from '../_data/lastShow';
import { plexCardPlan } from '../_lib/plexCard';
import { webhookUrlPrefix } from '../_lib/webhookUrl';
import LiveActivity from './LiveActivity';
import PlexPanel from './PlexPanel';

/**
 * The Plex card's hole, per user and never cached. Never the webhook token:
 * it is a bearer secret, fetched only on Show or Copy (`revealPlexUrl`). A
 * failed status read throws to the error boundary rather than claim "Not
 * connected".
 */
export default async function PlexCard() {
  const { accessToken } = await getSettingsViewer();
  const status = await loadPlexStatus(accessToken);
  if (!status) {
    throw new Error('Plex status unavailable');
  }
  const { panel, spotlight } = plexCardPlan(status);
  const prefix = webhookUrlPrefix(getBaseUrl(), 'plex');
  const show = spotlight
    ? await loadLastShow(spotlight.seriesId, spotlight.title)
    : null;
  // An API a build behind the web (or a stored answer from before) has no `week`
  const scrobbles =
    show && status.connected ? (
      <LiveActivity
        app="plex"
        recent={status.recent}
        show={show}
        week={status.week}
      />
    ) : null;
  return <PlexPanel {...panel} prefix={prefix} scrobbles={scrobbles} />;
}
