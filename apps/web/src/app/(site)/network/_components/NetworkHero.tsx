import { Suspense } from 'react';
import { getNetworkDetails } from '@/app/(site)/_discover/data/network';
import PageName from '@/components/header/PageName';
import {
  calendarGlyph,
  globeGlyph,
  seasonGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL, GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';

import { getLandingFacts } from '../../_discover/data/facts';
import {
  formatShows,
  LandingCrumb,
  LandingHero,
  SpotlightSkeleton,
} from '../../_discover/landing';
import type { NetworkLook } from '../_data/look';
import { getNetworkSince } from '../_data/since';
import { sinceLine } from '../_data/sinceLine';
import NetworkLogo from './NetworkLogo';
import NetworkSpotlight from './NetworkSpotlight';

export type NetworkEntry = Readonly<{
  id: number;
  name: string;
  slug: string;
  description: string;
  phoneDescription?: string;
  since?: Readonly<{ year: number; originals?: true }>;
}>;

const TITLE_ID = 'network-title';
const BAR = cn('block rounded-8', GHOST_FILL);
const FAILED_BAR = cn('block rounded-8', GHOST_LOOK.failed);

export const networkCrumb = <LandingCrumb href="/network" label="Networks" />;

/** The logo's place while it loads (48 / 72 tall) */
const logoGhost = (
  <span aria-hidden className={`${BAR} h-12 w-40 md:h-18 md:w-56`} />
);

/** The meta line's place while it loads: the width of "United States · 381 shows · Since 1972" (215 on a phone, which drops the year) */
const metaGhost = (
  <span aria-hidden className={`${BAR} mt-3 h-5 w-54 md:mt-4 md:w-76`} />
);

/** TMDB's logo (white unless it has a colour), or the name without one */
async function NetworkMark({
  keep,
  network,
}: Readonly<{ keep: boolean; network: NetworkEntry }>) {
  const details = await getNetworkDetails(network.id);
  // the logo is unavailable: the name, as for a network without a logo
  if (isUnavailable(details)) {
    return network.name;
  }
  return details?.logo ? (
    <NetworkLogo
      keep={keep}
      logo={details.logo}
      silhouette={details.logoSilhouette}
    />
  ) : (
    network.name
  );
}

/** One meta item whose read failed: a dashed bar of its size */
const failedItem = (size: string) => (
  <span aria-hidden className={cn(FAILED_BAR, 'h-5 shrink-0', size)} />
);

/** Country · "381 shows" · "Since 1972" (the year is dropped on a phone) */
async function NetworkMeta({ network }: Readonly<{ network: NetworkEntry }>) {
  const [details, facts, firstShow] = await Promise.all([
    getNetworkDetails(network.id),
    getLandingFacts('network', network.slug),
    // the design gives some networks their year: no read for those
    network.since ? null : getNetworkSince(network.id),
  ]);
  // each item has its own read: one that failed shows its own dashed bar,
  // the others still show (a failed count must not blank the country)
  return (
    <MetaRow className="mt-3 md:mt-4">
      {isUnavailable(details) ? (
        failedItem('w-24')
      ) : (
        <MetaItem icon={globeGlyph}>{details?.country ?? null}</MetaItem>
      )}
      {isUnavailable(facts) ? (
        failedItem('w-26')
      ) : (
        <MetaItem icon={seasonGlyph}>
          {facts ? formatShows(facts.count) : null}
        </MetaItem>
      )}
      {isUnavailable(firstShow) ? (
        failedItem('w-28 max-md:hidden')
      ) : (
        <MetaItem className="max-md:hidden" icon={calendarGlyph}>
          {sinceLine(network, firstShow)}
        </MetaItem>
      )}
    </MetaRow>
  );
}

/**
 * The network hero ("Best of, by…"): the logo as the title, the meta line
 * and the network's one line, left; the recommendation tile right (under it
 * on a phone). The crumb, the name and the line need no API; the logo, the
 * meta line and the tile come from cached loaders, each in its own
 * Suspense. All of it prerenders per slug.
 */
export default function NetworkHero({
  look,
  network,
}: Readonly<{ look: NetworkLook; network: NetworkEntry }>) {
  const tile = (
    <Suspense fallback={<SpotlightSkeleton />}>
      <NetworkSpotlight networkId={network.id} />
    </Suspense>
  );
  return (
    <LandingHero aside={tile} labelledBy={TITLE_ID}>
      {networkCrumb}
      <h1
        aria-label={network.name}
        // 8 under the crumb (the hero's crumb margin on lg)
        className="mt-2 font-display text-display text-white lg:mt-0"
        id={TITLE_ID}
      >
        <Suspense fallback={logoGhost}>
          <NetworkMark keep={look.keepLogo} network={network} />
        </Suspense>
      </h1>
      <PageName name={network.name} />
      <Suspense fallback={metaGhost}>
        <NetworkMeta network={network} />
      </Suspense>
      <p className="mt-3 max-w-[560px] text-body-sm text-white/80">
        {network.phoneDescription ? (
          <>
            <span className="max-md:hidden">{network.description}</span>
            <span className="md:hidden">{network.phoneDescription}</span>
          </>
        ) : (
          network.description
        )}
      </p>
    </LandingHero>
  );
}
