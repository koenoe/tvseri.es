import { headers } from 'next/headers';

import { fetchWatchProviders } from '@/lib/tmdb';

import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'GB';
  const providers = await fetchWatchProviders(region);

  return <DiscoverWatchProviders providers={providers} />;
}
