import 'server-only';

import type { ConnectionService } from '@tvseri.es/schemas';
import { headers } from 'next/headers';
import { browserFactsFrom } from '@/lib/extension/browserSupport';
import { loadConnectionStatus } from '../../_data/connections';
import { loadConnectionUnresolved } from '../../_data/connectionUnresolved';
import { getSettingsViewer } from '../../_data/session';
import { connectedService } from '../../_lib/services';
import { loadLastShow } from '../_data/lastShow';
import { serviceCardPlan } from '../_lib/serviceCard';
import LiveActivity from './LiveActivity';
import ServicePanel from './ServicePanel';
import ServiceReview from './ServiceReview';

const EMPTY_PAGE = { items: [], nextCursor: null };

/**
 * A service card's hole, read on the server so the first paint shows the
 * real state. The request's headers decide whether this browser can run the
 * extension; the hole is per viewer and never cached, so reading them costs
 * nothing. A failed read throws to the error boundary rather than claim
 * "Not connected".
 */
export default async function ServiceCard({
  service,
}: Readonly<{ service: ConnectionService }>) {
  const [{ accessToken, role }, request] = await Promise.all([
    getSettingsViewer(),
    headers(),
  ]);
  // Started beside the status rather than after it. It never rejects, so
  // leaving it unused (nothing to review) is safe
  const unresolved = loadConnectionUnresolved(accessToken, service);
  const loaded = await loadConnectionStatus(accessToken, service);
  if (!loaded) {
    throw new Error(`${service} status unavailable`);
  }
  const plan = serviceCardPlan(loaded, role, browserFactsFrom(request));
  const { review: reviewPlan, spotlight } = plan;
  const [show, page] = await Promise.all([
    spotlight ? loadLastShow(spotlight.seriesId, spotlight.title) : null,
    reviewPlan?.readPage ? unresolved : null,
  ]);
  const { copy } = connectedService(service);
  const activity = show ? (
    <LiveActivity
      app={service}
      heading={copy.activityHeading}
      recent={loaded.recent}
      show={show}
      week={loaded.week}
    />
  ) : null;
  // A page that couldn't be read leaves the list out; overflow alone needs none
  const reviewPage = reviewPlan?.readPage ? page : EMPTY_PAGE;
  const review =
    reviewPlan && reviewPage ? (
      <ServiceReview
        count={reviewPlan.count}
        overflow={reviewPlan.overflow}
        page={reviewPage}
      />
    ) : null;
  return (
    <ServicePanel
      activity={activity}
      browser={plan.browser}
      review={review}
      service={service}
      status={plan.status}
      syncNow={plan.syncNow}
    />
  );
}
