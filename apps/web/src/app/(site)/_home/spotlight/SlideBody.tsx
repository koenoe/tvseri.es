'use client';

import Image from 'next/image';
import {
  type CSSProperties,
  memo,
  type SyntheticEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';
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

/** The logo inside the 460 × 150 cap (260 × 70 on a phone) */
const LOGO_BOX =
  'block h-auto max-h-[70px] max-w-[260px] md:max-h-[150px] md:max-w-[460px]';

const LOGO_RATIO = '--logo-ratio';

/** The image's own width / height: the cap's box before an unknown ratio loads */
const INTRINSIC_RATIO = 920 / 300;

/**
 * The logo's box is held from its first paint, so the lines under it never
 * move: the cap's width at the API's ratio (the size a w500 logo loads at),
 * else at the image's intrinsic one. A file smaller than the cap keeps its
 * natural size inside the held box (`object-scale-down`), never stretched.
 * Without the API's ratio the box is released once the file loads
 * (`releaseLogoBox`): its natural size decides, as no ratio was promised.
 */
const LOGO_HELD = `${LOGO_BOX} aspect-(--logo-ratio) w-[min(260px,calc(70px*var(--logo-ratio)))] md:w-[min(460px,calc(150px*var(--logo-ratio)))]`;

const LOGO = `${LOGO_HELD} object-scale-down object-bottom md:object-bottom-left`;

/** A failed logo: the title in the logo's held box */
const LOGO_FALLBACK = cn(
  LOGO_HELD,
  'flex items-end justify-center md:justify-start',
);

// without the ratio, both held rules resolve to `auto`: the file's size
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
 * One slide's text: the rank
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

  const [failed, setFailed] = useState<string | null>(null);
  const markFailed = useCallback(() => setFailed(slide.logo), [slide.logo]);
  const logoStyle = useMemo(
    () =>
      ({
        [LOGO_RATIO]: slide.logoRatio ?? INTRINSIC_RATIO,
      }) as CSSProperties,
    [slide.logoRatio],
  );

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
  const hidden = leaving || undefined;

  return (
    <div
      aria-hidden={hidden}
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
        <TileLink
          backdrop={slide.backdrop}
          className={TITLE_LINK}
          draggable={false}
          href={slide.href}
        >
          {slide.logo && failed === slide.logo ? (
            <span className={LOGO_FALLBACK} style={logoStyle}>
              <span className="line-clamp-1 font-display text-display text-white md:line-clamp-2">
                {slide.title}
              </span>
            </span>
          ) : slide.logo ? (
            <Image
              alt={slide.title}
              className={LOGO}
              // The 460 × 150 cap at 2×; CSS holds the box (`LOGO_HELD`)
              height={300}
              loading="eager"
              onError={markFailed}
              onLoad={slide.logoRatio ? undefined : releaseLogoBox}
              src={slide.logo}
              style={logoStyle}
              // Natural size, capped (auto width/height): a
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
