import auth from '@/auth';
import { fetchWatchProviders } from '@/lib/api';
import { getRegion } from '@/lib/geo';
import DiscoverWatchProviders from './WatchProviders';

export default async function DiscoverWatchProvidersContainer() {
  const [{ user }, region] = await Promise.all([auth(), getRegion()]);
  const providers = await fetchWatchProviders(user?.country ?? region);

  return <DiscoverWatchProviders providers={providers} />;
}
