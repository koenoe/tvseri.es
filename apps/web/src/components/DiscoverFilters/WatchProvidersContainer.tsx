import { headers } from 'next/headers';

import { fetchWatchProviders } from '@/lib/api';

import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
  const providers = await fetchWatchProviders(region);

  return <DiscoverWatchProviders providers={providers} />;
}
