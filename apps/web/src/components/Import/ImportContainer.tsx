import auth from '@/auth';
import { fetchWatchProviders } from '@/lib/api';
import { resolveRegion } from '@/lib/geo';
import Import from './Import';

export default async function ImportContainer() {
  const { user } = await auth();
  const providers = await fetchWatchProviders(await resolveRegion(user));
  // Note: the importer only offers the provider names
  const providerNames = providers.map((provider) => provider.name);

  return <Import watchProviders={providerNames} />;
}
