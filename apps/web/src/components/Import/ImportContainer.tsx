import { headers } from 'next/headers';
import auth from '@/auth';
import { fetchWatchProviders } from '@/lib/api';
import Import from './Import';

export default async function ImportContainer() {
  const [{ user }, headerStore] = await Promise.all([auth(), headers()]);
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
  const providers = await fetchWatchProviders(user?.country ?? region);

  return <Import watchProviders={providers} />;
}
