'use client';

import Image from 'next/image';
import { type CSSProperties, memo, type SyntheticEvent, useMemo } from 'react';
import MarkControl from '@/components/marking/MarkControl';
import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
  trendingGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import type { Slide } from './slide';
import { SLIDE_ACTIONS, SLIDE_BODY } from './slideFrame';
import styles from './spotlight.module.css';

/** The buttons take clicks; the rest of the text lets them through */
const ACTIONS = `pointer-events-auto ${SLIDE_ACTIONS}`;

/** The logo at its file's natural size, inside the 460 × 150 cap (260 × 70 on a phone) */
const LOGO_BOX =
  'block h-auto max-h-[70px] max-w-[260px] md:max-h-[150px] md:max-w-[460px]';

const LOGO = `${LOGO_BOX} w-auto`;

const LOGO_RATIO = '--logo-ratio';

/**
 * With the logo's aspect ratio from the API, its box is held before it
 * loads: the cap's width at that ratio (the size a w500 logo loads at), so
 * the lines under it don't move. Once loaded the ratio is dropped
 * (`releaseLogoBox`): both rules then resolve to `auto` and the file's
 * natural size decides, as without it (a logo narrower than the cap is not
 * stretched).
 */
const LOGO_HELD = `${LOGO_BOX} aspect-(--logo-ratio) w-[min(260px,calc(70px*var(--logo-ratio)))] md:w-[min(460px,calc(150px*var(--logo-ratio)))]`;

const releaseLogoBox = (event: SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.removeProperty(LOGO_RATIO);
};

/**
 * The logo (or title) is the slide's link to the show: the white focus
 * ring, a light dim on hover and press.
 */
const TITLE_LINK =
  'pointer-events-auto block rounded-4 transition-opacity duration-200 hover:opacity-85 active:opacity-70';

/**
 * One slide's text (HMFinal `hx-spb`, HMFinalMobile `hx-mspc`): the rank
 * line, the logo (or the title when there is none), the meta row, the hook
 * line and the actions. Desktop: bottom left on the page container, left
 * aligned. Phone: centred, 12px apart. The logo links to the show; the rest
 * of the text lets clicks through to the artwork's link behind it, except
 * the buttons. A switch fades the new text in over 600ms while the old one
 * fades out over the first 300ms (in step with the backdrop and the page
 * colour); the old one is inert meanwhile. Memoised: the carousel renders
 * on every pause, hover and pager press, which change no slide's text.
 */
function SlideBody({
  entering = false,
  hook,
  label,
  leaving = false,
  slide,
  states,
}: Readonly<{
  /** fading in: the slide just switched to */
  entering?: boolean;
  /** the hook line, or the viewer's personal line; '' leaves it out */
  hook: string;
  label: string;
  /** fading out under the slide switched to */
  leaving?: boolean;
  slide: Slide;
  /** the viewer's states (the page's one read) for the slide's control */
  states?: ControlStatesRead;
}>) {
  const metaClasses = cn(
    'justify-center gap-3 md:justify-start md:gap-4',
    // the hook line stands the same 16px from the meta row and the buttons
    hook ? 'md:mb-4' : 'md:mb-6',
  );
  // the logo stands 24px above the meta row, the title 8px
  const titleClasses = slide.logo ? 'm-0 md:mb-6' : 'm-0 md:mb-2';

  const logoClasses = slide.logoRatio ? LOGO_HELD : LOGO;
  const logoStyle = slide.logoRatio
    ? ({ [LOGO_RATIO]: slide.logoRatio } as CSSProperties)
    : undefined;

  const show = useMemo(
    () => ({
      href: slide.href,
      id: slide.id,
      seasons: slide.seasons,
      title: slide.title,
    }),
    [slide],
  );

  const bodyClasses = cn(
    SLIDE_BODY,
    leaving ? styles.leaving : entering && styles.fadeIn,
  );

  return (
    <div
      aria-hidden={leaving || undefined}
      aria-label={label}
      aria-roledescription="slide"
      className={bodyClasses}
      inert={leaving}
      role="group"
    >
      <span className="inline-flex items-center gap-3 text-meta text-white/60 md:mb-[18px] md:gap-2 md:text-white/80">
        <Icon
          className="size-[13px] md:size-3.5"
          glyph={trendingGlyph}
          size={13}
        />
        <span className="text-white/80">{slide.rank}</span>
      </span>
      <h2 className={titleClasses}>
        <TileLink className={TITLE_LINK} draggable={false} href={slide.href}>
          {slide.logo ? (
            <Image
              alt={slide.title}
              className={logoClasses}
              // The 460 × 150 cap at 2×; CSS sets both sides from the file's
              // natural size (before it loads, from `logoRatio` when known)
              height={300}
              loading="eager"
              onLoad={slide.logoRatio ? releaseLogoBox : undefined}
              src={slide.logo}
              style={logoStyle}
              // Natural size, capped (the board's auto width/height): a
              // srcset's width descriptors would shrink it. The API's w500 is
              // the loader's cap for logos anyway.
              unoptimized
              width={920}
            />
          ) : (
            <span className="block font-display text-display text-white md:leading-[70px]">
              {slide.title}
            </span>
          )}
        </TileLink>
      </h2>
      <MetaRow className={metaClasses}>
        <MetaItem icon={calendarGlyph}>{slide.year}</MetaItem>
        <MetaItem icon={seasonGlyph}>{slide.seasons}</MetaItem>
        <MetaItem icon={tagGlyph} shrink>
          {slide.genre}
        </MetaItem>
      </MetaRow>
      {hook ? (
        <p className="m-0 max-w-full truncate text-body text-white/80 md:mb-4">
          {hook}
        </p>
      ) : null}
      <div className={ACTIONS}>
        <MarkControl look="spotlight" show={show} states={states} />
      </div>
    </div>
  );
}

const MemoSlideBody = memo(SlideBody);
MemoSlideBody.displayName = 'SlideBody';

export default MemoSlideBody;
