import type { WatchProvider } from '@tvseri.es/schemas';
import auth from '@/auth';
import { fetchWatchProviders, updateWatchProviders } from '@/lib/api';
import { getRegion } from '@/lib/geo';
import StreamingServices from './StreamingServices';

export default async function StreamingServicesContainer() {
  const [region, { user, accessToken }] = await Promise.all([
    getRegion(),
    auth(),
  ]);

  if (!user || !accessToken) {
    return null;
  }

  const providers = await fetchWatchProviders(user.country || region, {
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
