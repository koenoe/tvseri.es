import type { MouseEventHandler, ReactNode } from 'react';

import GlassPill from '@/components/ui/glass/GlassPill';
import type { Glyph } from '@/components/ui/icon/types';
import CardRim from '@/components/ui/tile/CardRim';
import TitleTreatment, {
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';

import UpNextArt from './UpNextArt';
import {
  UP_NEXT_ACTIONS,
  UP_NEXT_BODY,
  UP_NEXT_BOX,
  UP_NEXT_LOGO,
  UP_NEXT_PILL_SIZE,
  UP_NEXT_START,
  UP_NEXT_TOP,
} from './upNextLayout';

/**
 * The show's title treatment in the logo box, or its title in up to two
 * lines on a phone, three in the 144px box from md
 */
// Each place keeps its own look on purpose; don't unify them.
const UP_NEXT_TITLE: TitleTreatmentLook = {
  box: UP_NEXT_LOGO,
  lines: 'line-clamp-2 min-w-0 [overflow-wrap:anywhere] md:line-clamp-3',
  logo: 'object-contain object-bottom md:object-left-bottom',
  sizes: '(min-width: 768px) 425px, 220px',
  text: 'flex items-end justify-center text-center font-display text-title-1 text-balance text-white md:h-36 md:justify-start md:text-left',
};

const CARD = cn(
  UP_NEXT_BOX,
  'md:shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1)]',
);

type Props = Readonly<{
  /** The controls at the top right (a ⋯, an eye, a +) */
  actions?: ReactNode;
  backdrop?: string;
  /** A tone on the backdrop (the borrowed pick is dimmed) */
  backdropClassName?: string;
  /** The glass bar (`UpNextBar`) */
  bar: ReactNode;
  /** The facts line (`UpNextFacts`) */
  facts: ReactNode;
  href: string;
  label: string;
  /** `eager` above the fold */
  loading?: 'eager' | 'lazy';
  logo?: string;
  /**
   * The card opens its show by handing its art and logo over to the show
   * page (`showMorph.ts`): the profile's Up next, never a dimmed pick
   */
  morph?: boolean;
  /** The link's click, before it navigates */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  /** The place's warm-up when the card is pointed at (`TileLink`) */
  onIntent?: () => void;
  /** The glass pill at the top left */
  pill: Readonly<{ glyph: Glyph; text: string }> | null;
  /** The place's tag, above the pill (a visitor's "New to you") */
  tag?: ReactNode;
  title: string;
}>;

/**
 * The Up next card, one component for Home's Continue watching and the
 * profile's Up next / Watching now: the backdrop under its shades (the whole
 * card is one link), the title treatment, the facts line and the glass bar
 * at its foot, the place's tag and a glass pill top left (the tag first)
 * and the place's own controls top right. The words sit above the link and let presses through to it.
 */
export default function UpNextCard({
  actions,
  backdrop,
  backdropClassName,
  bar,
  facts,
  href,
  label,
  loading,
  logo,
  morph = false,
  onClick,
  onIntent,
  pill,
  tag,
  title,
}: Props) {
  const scope = morph ? '' : undefined;
  return (
    <article
      className={CARD}
      data-show-morph-scope={scope}
      data-slot="up-next-card"
    >
      <UpNextArt
        backdrop={backdrop}
        className={backdropClassName}
        href={href}
        label={label}
        loading={loading}
        onClick={onClick}
        onIntent={onIntent}
      />
      <div className={UP_NEXT_BODY}>
        <TitleTreatment
          loading={loading}
          look={UP_NEXT_TITLE}
          morph={morph}
          src={logo}
          title={title}
        />
        {facts}
        {bar}
      </div>
      <CardRim />
      <div className={UP_NEXT_TOP}>
        <div className={UP_NEXT_START}>
          {tag}
          {pill ? (
            <GlassPill className={UP_NEXT_PILL_SIZE} glyph={pill.glyph}>
              {pill.text}
            </GlassPill>
          ) : null}
        </div>
        {actions ? <div className={UP_NEXT_ACTIONS}>{actions}</div> : null}
      </div>
    </article>
  );
}
