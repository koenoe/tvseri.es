import type { WatchProvider } from '@tvseri.es/schemas';
import auth from '@/auth';
import { fetchWatchProviders, updateWatchProviders } from '@/lib/api';
import { resolveRegion } from '@/lib/geo';
import StreamingServices from './StreamingServices';

export default async function StreamingServicesContainer() {
  const { user, accessToken } = await auth();

  if (!user || !accessToken) {
    return null;
  }

  const providers = await fetchWatchProviders(await resolveRegion(user));

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
