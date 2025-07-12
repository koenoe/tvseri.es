import { headers } from 'next/headers';
import auth from '@/auth';
import { fetchWatchProviders } from '@/lib/api';
import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const [{ session }, headerStore] = await Promise.all([auth(), headers()]);
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
  const providers = await fetchWatchProviders(session?.country ?? region);

  return <DiscoverWatchProviders providers={providers} />;
}
