import { headers } from 'next/headers';

import { getRegionFromHeaders, resolveRegionFromHeaders } from '@/lib/geo';
import { loadRegionProviders } from '@/lib/watchProviders/regionProviders';
import { streamingServices } from '@/lib/watchProviders/streamingServices';
import { getSettingsSession } from '../../_data/session';
import ServicesEditor from './ServicesEditor';

/**
 * The streamed part of Streaming services: the saved country (else where the
 * visitor is) picks the region, and the region picks the services listed. The
 * viewer's own selection comes from the session, never from the cache.
 */
export default async function StreamingServicesSection() {
  const { user } = await getSettingsSession();
  const headerStore = await headers();
  const detected = getRegionFromHeaders(headerStore, null);
  const region = resolveRegionFromHeaders(user, headerStore);
  // Services only: stores and aggregators aren't something you watch on
  const providers = streamingServices(await loadRegionProviders(region));

  return (
    <ServicesEditor
      detected={detected}
      initialRegion={region}
      initialSelected={user.watchProviders ?? []}
      providers={providers}
    />
  );
}
