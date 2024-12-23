import { headers } from 'next/headers';

import { fetchWatchProviders } from '@/lib/tmdb';

import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'GB';
  const providers = await fetchWatchProviders(region);

  console.log({ providers });

  return <DiscoverWatchProviders providers={providers} />;
}
