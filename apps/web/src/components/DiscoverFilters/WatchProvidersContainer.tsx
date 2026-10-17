import { fetchWatchProviders } from '@/lib/api';
import getWatchRegion from './getWatchRegion';
import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const providers = await fetchWatchProviders(await getWatchRegion());

  return <DiscoverWatchProviders providers={providers} />;
}
