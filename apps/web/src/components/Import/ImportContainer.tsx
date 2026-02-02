import auth from '@/auth';
import { fetchWatchProviders } from '@/lib/api';
import { getRegion } from '@/lib/geo';
import Import from './Import';

export default async function ImportContainer() {
  const [{ user }, region] = await Promise.all([auth(), getRegion()]);
  const providers = await fetchWatchProviders(user?.country ?? region);

  return <Import watchProviders={providers} />;
}
