import { fetchWatchProviders } from '@/lib/api';
import getWatchRegion from './getWatchRegion';
import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const providers = await fetchWatchProviders(await getWatchRegion());
  // Note: only send what the client component reads
  const options = providers.map(({ id, logo, name }) => ({ id, logo, name }));

  return <DiscoverWatchProviders providers={options} />;
}
