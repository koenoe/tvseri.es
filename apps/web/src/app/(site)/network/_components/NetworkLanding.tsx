import { networkBySlug } from '@tvseri.es/constants';
import { notFound } from 'next/navigation';

import { LandingPage, LandingShell } from '../../_discover/landing';
import { networkLook } from '../_data/look';
import NetworkHero from './NetworkHero';
import NetworkHeroSkeleton from './NetworkHeroSkeleton';
import NetworkSections, { NetworkSectionsSkeleton } from './NetworkSections';
import NetworkWash from './NetworkWash';

/**
 * The page before the slug is known (the cached shell of every network):
 * no colour of its own (`LandingShell`), the real crumb, and every section's place.
 */
export function NetworkLandingShell() {
  return (
    <LandingShell>
      <NetworkHeroSkeleton />
      <NetworkSectionsSkeleton />
    </LandingShell>
  );
}

/**
 * `/network/{slug}`: the network's ground and wash
 * (static per slug), then the hero and the rows, each streamed on its own.
 */
export default async function NetworkLanding({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const network = networkBySlug(slug);
  if (!network) {
    notFound();
  }
  const look = networkLook(network.slug);
  return (
    <LandingPage ground={look.ground}>
      <NetworkWash wash={look.wash} />
      <NetworkHero look={look} network={network} />
      <NetworkSections network={network} />
    </LandingPage>
  );
}
