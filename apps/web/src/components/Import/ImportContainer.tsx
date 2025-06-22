import { headers } from 'next/headers';

import { fetchWatchProviders } from '@/lib/api';

import Import from './Import';

export default async function ImportContainer() {
  const region = (await headers()).get('cloudfront-viewer-country') || 'US';
  const providers = await fetchWatchProviders(region);

  return <Import watchProviders={providers} />;
}
