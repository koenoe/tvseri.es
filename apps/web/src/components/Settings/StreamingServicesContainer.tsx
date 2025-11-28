import type { WatchProvider } from '@tvseri.es/schemas';
import { headers } from 'next/headers';
import auth from '@/auth';
import { fetchWatchProviders, updateWatchProviders } from '@/lib/api';
import StreamingServices from './StreamingServices';

export default async function StreamingServicesContainer() {
  const [headerStore, { user, accessToken }] = await Promise.all([
    headers(),
    auth(),
  ]);

  if (!user || !accessToken) {
    return null;
  }

  const region =
    user.country || headerStore.get('cloudfront-viewer-country') || 'US';
  const providers = await fetchWatchProviders(region, {
    includeColors: true,
  });

  async function updateAction(watchProviders: WatchProvider[]) {
    'use server';

    const { accessToken } = await auth();

    if (!accessToken) {
      return;
    }

    await updateWatchProviders({
      accessToken,
      watchProviders,
    });
  }

  return (
    <StreamingServices
      action={updateAction}
      initialSelected={user.watchProviders || []}
      providers={providers}
    />
  );
}
