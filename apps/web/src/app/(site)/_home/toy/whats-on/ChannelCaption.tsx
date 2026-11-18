import type { WhatsOnChannel } from '@tvseri.es/schemas';
import Link from 'next/link';

import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';
import NetworkWordmark from '@/components/ui/network/NetworkWordmark';
import TitleTreatment, {
  TITLE_LOGO_FIT,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import showPath from '@/lib/routing/showPath';
import {
  ACTION_PAIR,
  ACTION_PAIR_BUTTON,
  ACTION_PAIR_SOLID,
} from '../../actionPair';
import ShowMeta from '../../feature/ShowMeta';
import {
  CAPTION_CHANNEL,
  CAPTION_FOOT,
  CAPTION_LOGO,
  CAPTION_META,
  CAPTION_NETWORK,
  CAPTION_SERVICE,
  CAPTION_TITLE,
  CAPTION_TOP,
  CAPTION_WORDMARK,
} from './layout';

/** The wordmark's box at 2×, at a typical 4:1 logo's ratio (CSS sets the
 * height; the attributes give the width before it loads) */
const WORDMARK_HEIGHT_2X = 30;
const WORDMARK_WIDTH_2X = 120;

/** The show's logo in a 240 × 60 limit, else its title written */
// Each place keeps its own look on purpose; don't unify them.
const CAPTION_TITLE_LOOK: TitleTreatmentLook = {
  box: CAPTION_LOGO,
  logo: TITLE_LOGO_FIT,
  sizes: '240px',
  text: CAPTION_TITLE,
};

/**
 * What's on the screen for one channel: "CH 01"
 * top left and the service top right (the network's wordmark, white, else
 * its name), the show's logo (or its title), its facts and
 * the two actions bottom left.
 */
export default function ChannelCaption({
  channel: { network, series },
  networkHref,
  number,
}: Readonly<{
  channel: WhatsOnChannel;
  networkHref: string | undefined;
  number: string;
}>) {
  const showHref = showPath(series.id, series.slug);
  return (
    <>
      <span className={CAPTION_TOP}>
        <b className={CAPTION_CHANNEL}>CH {number}</b>
        <span className={CAPTION_SERVICE}>
          {network.wordmark ? (
            <NetworkWordmark
              alt={network.name}
              className={CAPTION_WORDMARK}
              height={WORDMARK_HEIGHT_2X}
              sizes="112px"
              src={network.wordmark}
              width={WORDMARK_WIDTH_2X}
            />
          ) : (
            <span className={CAPTION_NETWORK}>{network.name}</span>
          )}
        </span>
      </span>
      <div className={CAPTION_FOOT}>
        {/* The logo (or title) opens the show too, for a pointer; keyboards
            and screen readers get the one "Open {show}" link below */}
        <Link
          aria-hidden="true"
          className="block transition-opacity duration-200 hover:opacity-85 active:opacity-70"
          href={showHref}
          prefetch={false}
          tabIndex={-1}
        >
          {/* 240 × 60 limit, the logo on its bottom left */}
          <TitleTreatment
            look={CAPTION_TITLE_LOOK}
            src={series.titleTreatmentImage}
            title={series.title}
          />
        </Link>
        <ShowMeta className={CAPTION_META} series={series} />
        <span className={ACTION_PAIR}>
          <ButtonLink
            className={ACTION_PAIR_SOLID}
            href={showHref}
            icon={arrowRightGlyph}
            size="sm"
            variant="primary"
          >
            {`Open ${series.title}`}
          </ButtonLink>
          {networkHref ? (
            <ButtonLink
              className={ACTION_PAIR_BUTTON}
              href={networkHref}
              icon={arrowRightGlyph}
              size="sm"
            >
              {`All on ${network.name}`}
            </ButtonLink>
          ) : null}
        </span>
      </div>
    </>
  );
}
