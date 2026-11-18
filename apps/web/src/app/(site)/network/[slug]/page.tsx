import { networkBySlug } from '@tvseri.es/constants';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { NOT_FOUND_METADATA } from '../../_discover/landing/notFoundMetadata';
import NetworkLanding, {
  NetworkLandingShell,
} from '../_components/NetworkLanding';

/** One sample slug (Cache Components needs one); every other network renders on demand and is cached */
export function generateStaticParams() {
  return [{ slug: 'hbo' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/network/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const network = networkBySlug(slug);
  return network
    ? { description: network.description, title: network.name }
    : NOT_FOUND_METADATA;
}

export default function Page({ params }: PageProps<'/network/[slug]'>) {
  return (
    <Suspense fallback={<NetworkLandingShell />}>
      <NetworkLanding params={params} />
    </Suspense>
  );
}
