import { headers } from 'next/headers';

import { fetchWatchProviders } from '@/lib/tmdb';

import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const region = headers().get('x-vercel-ip-country') || 'US';
  const providers = await fetchWatchProviders(region);

  return <DiscoverWatchProviders providers={providers} />;
}
