import { hasEnoughPosters } from '@tvseri.es/constants';
import Link from 'next/link';

import { getGoDeeper } from '@/app/(site)/_discover/data/goDeeper';
import {
  DEFAULT_LOGO_RATIO,
  getNetworkDetails,
} from '@/app/(site)/_discover/data/network';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';
import NetworkWordmark from '@/components/ui/network/NetworkWordmark';
import Row from '@/components/ui/row/Row';
import RowError from '@/components/ui/row/RowError';
import { GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import { pluralCapped } from '@/lib/format/text';
import landingPath from '@/lib/routing/landingPath';
import { withYear } from '../_data/hubShow';
import HubPoster from './HubPoster';

export const ESSENTIALS_ID = 'essentials';

/** The logo is 20px tall (17 on a phone): its file at 2× */
const LOGO_HEIGHT_2X = 40;

/**
 * The title while the row loads: the logo's place (its 20px line, 17 on a
 * phone, at a typical width) on the words' baseline, then "Essentials"
 */
export function EssentialsTitleGhost() {
  return (
    <span className="inline-flex items-baseline gap-2.5 md:gap-3">
      <span
        aria-hidden
        className={`inline-block h-4.25 w-17 rounded-4 md:h-5 md:w-20 ${GHOST_LOOK.loading}`}
      />
      Essentials
    </span>
  );
}

/**
 * Today's network Essentials: the white network logo +
 * "Essentials" as the row title, the logo's bottom on the text baseline;
 * the logo and "All 244 shows" open the network's landing. The network
 * rotates by day (API).
 */
export default async function Essentials() {
  const goDeeper = await getGoDeeper();
  if (isUnavailable(goDeeper)) {
    return (
      <RowError
        caption="hub"
        id={ESSENTIALS_ID}
        look="hubPoster"
        state="unavailable"
        title="Essentials"
      />
    );
  }
  const { essentials } = goDeeper;
  const { network } = essentials;
  // the API leaves out a row under three posters; an older cached day too
  if (!hasEnoughPosters(essentials.items.length)) {
    return null;
  }
  const found = await getNetworkDetails(network.id);
  // without the logo, the name is the title
  const details = isUnavailable(found) ? null : found;
  const logo = details?.logo ?? null;
  const silhouette = details?.logoSilhouette ?? true;
  // the logo's own ratio (read from the file) sizes its box before it loads,
  // so "Essentials" never moves; 4:1 when unknown
  const ratio = details?.logoRatio ?? DEFAULT_LOGO_RATIO;
  const logoWidth = Math.round(LOGO_HEIGHT_2X * ratio);
  const logoSizes = `${Math.round((LOGO_HEIGHT_2X / 2) * ratio)}px`;
  const href = landingPath('network', network.slug);
  const logoLabel = `${network.name}, all series`;
  const titleContent = (
    <span className="inline-flex items-baseline gap-2.5 md:gap-3">
      <Link
        aria-label={logoLabel}
        className="group/logo inline-flex items-end rounded-6 leading-0 focus-visible:outline-offset-4"
        href={href}
      >
        {logo ? (
          <NetworkWordmark
            alt={network.name}
            className="h-4.25 w-auto opacity-95 group-hover/logo:opacity-100 [--chip-pad:2px] md:h-5"
            // the 20px-tall box at 2×, at the logo's own ratio (CSS sets the
            // height; the attributes give the width before it loads)
            height={LOGO_HEIGHT_2X}
            silhouette={silhouette}
            sizes={logoSizes}
            src={logo}
            width={logoWidth}
          />
        ) : (
          network.name
        )}
      </Link>
      Essentials
    </span>
  );
  const allLabel = `All ${pluralCapped(essentials.total, 'series', 'series')}`;
  const all = (
    <ButtonLink
      className="px-4 max-md:hidden"
      href={href}
      icon={arrowRightGlyph}
      size="sm"
    >
      {allLabel}
    </ButtonLink>
  );
  return (
    <Row
      actions={all}
      id={ESSENTIALS_ID}
      look="hubPoster"
      name={ESSENTIALS_ID}
      title={`${network.name} Essentials`}
      titleContent={titleContent}
    >
      {essentials.items.map((show) => (
        <HubPoster key={show.id} show={withYear(show)} />
      ))}
    </Row>
  );
}
