import type { WatchProvider } from '@tvseri.es/types';
import { headers } from 'next/headers';
import auth from '@/auth';
import { fetchWatchProviders, updateWatchProviders } from '@/lib/api';
import StreamingServices from './StreamingServices';

export default async function StreamingServicesContainer() {
  const [headerStore, { user, session }] = await Promise.all([
    headers(),
    auth(),
  ]);

  if (!user || !session) {
    return null;
  }

  const region =
    session.country ?? headerStore.get('cloudfront-viewer-country') ?? 'US';
  const providers = await fetchWatchProviders(region, {
    includeColors: true,
  });

  async function updateAction(watchProviders: WatchProvider[]) {
    'use server';

    const { encryptedSessionId } = await auth();

    if (!encryptedSessionId) {
      return;
    }

    await updateWatchProviders({
      sessionId: encryptedSessionId,
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
