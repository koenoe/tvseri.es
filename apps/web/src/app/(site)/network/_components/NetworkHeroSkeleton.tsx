import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_LOOK, GhostLine } from '@/components/ui/row/RowGhosts';

import { LandingHero, SpotlightSkeleton } from '../../_discover/landing';
import { networkCrumb } from './NetworkHero';

const BAR = `block rounded-8 ${GHOST_LOOK.loading}`;
const LOGO_BAR = `${BAR} mt-2 h-12 w-40 md:h-18 md:w-56`;
const LINE_LINES = `mt-3 flex w-full max-w-[560px] flex-col ${PULSE}`;

/**
 * The hero while the network's data loads, at the hero's exact size: the
 * real crumb, the logo's place (48 / 72 tall), the meta line and the
 * line's lines (bars in their line boxes), and the tile's own ghost.
 */
export default function NetworkHeroSkeleton() {
  return (
    <LandingHero
      aside={<SpotlightSkeleton />}
      labelledBy="network-loading"
      placeholder
    >
      {networkCrumb}
      <h1 className="sr-only" id="network-loading">
        Loading
      </h1>
      <span aria-hidden className={LOGO_BAR} />
      <GhostLine className="mt-3 h-5 md:mt-4" look="loading" width="w-64" />
      {/* the line: three lines of 24 on a phone, two from md */}
      <span aria-hidden className={LINE_LINES}>
        <GhostLine className="h-6" inPulse look="loading" width="w-full" />
        <GhostLine className="h-6" inPulse look="loading" width="w-11/12" />
        <GhostLine
          className="h-6 md:hidden"
          inPulse
          look="loading"
          width="w-2/3"
        />
      </span>
    </LandingHero>
  );
}
