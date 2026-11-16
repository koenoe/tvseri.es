import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import MarkControl from '@/components/marking/MarkControl';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import { FOOT_SHADE } from '@/components/ui/tile/footShade';
import {
  type TitleLogoLook,
  TitleTreatmentLogo,
} from '@/components/ui/title/TitleTreatment';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import showPath from '@/lib/routing/showPath';

type SpotlightShow = Readonly<{
  id: number;
  slug: string;
  title: string;
  backdrop: string | null;
  /** the show's title treatment (TMDB logo); the title as text without one */
  logo: string | null;
}>;

type Props = Readonly<{
  /** the overline: "Start here", "Returning Tue 17 Nov" (a pink one for a premiere) */
  kicker: ReactNode;
  /** a `MetaRow` (year, seasons, genre); desktop only, phones drop it */
  meta?: ReactNode;
  /** one plain body-sm line built from the data, never an invented fact */
  reason: string;
  /** "3 seasons", the end of the control's Finished */
  seasons?: string | null;
  show: SpotlightShow;
  /** the viewer's state for the show (`loadSeriesStates`) */
  states?: ControlStatesRead;
}>;

/** The show's logo: 44 tall, up to 300 wide (phones 32 / 200), at its own width */
// Each place keeps its own look on purpose; don't unify them.
const SPOTLIGHT_LOGO: TitleLogoLook = {
  height: 0,
  logo: 'block h-8 w-auto max-w-[200px] object-contain object-left-bottom md:h-11 md:max-w-[300px]',
  sizes: '(min-width: 768px) 300px, 200px',
  width: 0,
};

/**
 * The hero's recommendation tile (title left, recommendation
 * tile right): the backdrop dimmed
 * under a bottom shade, a kicker, the show's logo (its name without one), a
 * meta line, the reason
 * and the Watchlist + Seen it control (one button in the viewer's state
 * once they have the show). The whole tile opens the show. Never the show page's rating or
 * circles. 440 tall in the hero's 640 column, 220 at full width on a phone.
 */
export default function Spotlight({
  kicker,
  meta,
  reason,
  seasons,
  show,
  states,
}: Props) {
  const href = showPath(show.id, show.slug);
  const mark = { href, id: show.id, seasons, title: show.title };
  return (
    <article
      aria-label={show.title}
      className="relative flex h-55 flex-col justify-end overflow-hidden rounded-16 bg-[#1b2122] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(221_238_255/0.08)] md:h-110"
      data-hairline
    >
      {/* the backdrop and its shade: one layer, clipped once by the corners */}
      <span aria-hidden className={PICTURE_LAYER}>
        {show.backdrop ? (
          <Image
            alt=""
            className="object-cover brightness-62 saturate-80"
            fill
            // the hero's tile: above the fold, often the LCP image
            loading="eager"
            sizes="(min-width: 1024px) 640px, calc(100vw - 32px)"
            src={show.backdrop}
          />
        ) : null}
        <span className={FOOT_SHADE} />
      </span>
      {/* The whole tile opens the show, for a pointer; the keyboard and
          screen readers have the title's link. The text lets clicks through
          to it, the links and the pills take their own. */}
      <Link
        aria-hidden="true"
        className="absolute inset-0"
        href={href}
        tabIndex={-1}
      />
      <div className="pointer-events-none relative flex flex-col items-start p-4 md:p-8">
        <p className="text-overline text-white/60 uppercase">{kicker}</p>
        {show.logo ? (
          // 44 tall, up to 300 wide, 16 under the kicker; phones 32 / 200 / 8
          <Link
            aria-label={show.title}
            className="pointer-events-auto mt-2 md:mt-4"
            href={href}
          >
            <TitleTreatmentLogo
              alt=""
              look={SPOTLIGHT_LOGO}
              src={show.logo}
              title={show.title}
            />
          </Link>
        ) : (
          <Link
            className="pointer-events-auto mt-2 text-title-1 text-white transition-colors hover:text-white/80"
            href={href}
          >
            {show.title}
          </Link>
        )}
        {meta ? <div className="mt-4 max-md:hidden">{meta}</div> : null}
        <p className="mt-2 max-w-[520px] text-body-sm text-white/80 md:mt-3">
          {reason}
        </p>
        <div className="pointer-events-auto mt-4 flex items-center md:mt-6">
          <MarkControl look="landing" show={mark} states={states} />
        </div>
      </div>
    </article>
  );
}
