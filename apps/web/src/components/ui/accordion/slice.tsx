import Image from 'next/image';
import type { ReactNode } from 'react';

import { TEXT_ARRIVAL } from '@/components/motion/textArrival';

import {
  clockGlyph,
  completeGlyph,
  eyeGlyph,
  flagGlyph,
  onAirGlyph,
  seasonGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import {
  TITLE_LOGO_FIT,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';

/** The pieces every accordion slice is made of */

/** What a fact under a slice's title is about: it picks the fact's icon */
export type FactKind =
  | 'ended'
  | 'finished'
  | 'ongoing'
  | 'runtime'
  | 'seasons'
  | 'up-to-date'
  | 'watching';

/** One fact under the open slice's title: "2 seasons", "Finished Apr 11" */
export type Fact = Readonly<{ kind: FactKind; text: string }>;

const FACT_ICON: Readonly<Record<FactKind, Glyph | ToggleGlyph>> = {
  ended: flagGlyph,
  finished: completeGlyph,
  ongoing: onAirGlyph,
  runtime: clockGlyph,
  seasons: seasonGlyph,
  'up-to-date': completeGlyph,
  watching: eyeGlyph,
};

/*
 * The open state is `data-open` on the slice (`SliceAccordion`), and
 * `data-shown` for the text's arrival (`textArrival.ts`). Class names stay
 * literal so Tailwind sees them.
 *
 * A slice's size changes at once and Motion plays it as a transform, so
 * anything sized or placed by the slice's own box would jump or re-wrap
 * mid-animation. Content therefore keeps the open slice's size (fixed widths
 * at xl, the 300px open row below it, placed from the top or left edge),
 * the slice clips it, and it changes only by opacity. What sits on a closed
 * slice's centre or the open one's right edge hides at once instead.
 */

/** A part placed by the closed (or the open) slice's box: off in the frame the slice changes, then fades in */
export const OPEN_HIDES_AT_ONCE =
  'group-data-[open=true]/fv:opacity-0 group-data-[open=true]/fv:duration-0';

export function SliceBackdrop({
  dim,
  loading,
  src,
}: Readonly<{
  dim?: boolean;
  loading: 'eager' | 'lazy';
  src: string | null | undefined;
}>) {
  if (!src) {
    return null;
  }
  // Brightness is a black layer fading (opacity composites; a filter
  // transition would repaint every frame): 50% → 80% bright, dimmed 32% → 72%.
  const saturation = dim ? 'saturate-50' : 'saturate-75';
  const veil = dim
    ? 'opacity-[0.68] group-data-[open=true]/fv:opacity-[0.28]'
    : 'opacity-50 group-data-[open=true]/fv:opacity-20';
  const imageClass = `object-cover ${saturation}`;
  const veilClass = `absolute inset-0 bg-black transition-opacity duration-500 ${veil}`;
  return (
    <>
      <Image
        alt=""
        className={imageClass}
        fill
        loading={loading}
        sizes="(min-width: 1280px) 520px, 100vw"
        src={src}
      />
      <span aria-hidden="true" className={veilClass} />
    </>
  );
}

export function SliceShade() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-[linear-gradient(0deg,rgb(15_20_20/0.9)_0%,rgb(15_20_20/0.35)_45%,transparent_75%)]"
    />
  );
}

/**
 * The inner 1px ring of the slice at rest. No hover state: the
 * slice opening is the hover's feedback. It hides at once
 * while the slice's size animates (`data-moving`) and fades back once it
 * settles, so it never shows at one size inside the other.
 */
export function SliceRing({ dim }: Readonly<{ dim?: boolean }>) {
  // a dimmed slice's ring dims with it: the same rim, a little fainter
  const ring = dim ? 'opacity-60' : '';
  const ringClass = `pointer-events-none absolute inset-0 rounded-12 shadow-image-rim transition-opacity duration-200 group-data-[moving=true]/fv:opacity-0 group-data-[moving=true]/fv:duration-0 ${ring}`;
  return <span aria-hidden="true" className={ringClass} data-hairline />;
}

/** The open slice's content: title treatment, facts, an action */
export function SliceFull({
  children,
  interactive,
}: Readonly<{
  children: ReactNode;
  /** Holds a button: above the slice's link, only the button takes clicks */
  interactive?: boolean;
}>) {
  const layer = interactive ? 'pointer-events-none z-3' : 'z-1';
  // the slice opening is the picture's reveal; the text arrives behind it
  const classes = `${layer} absolute top-0 right-4 left-4 flex h-[284px] flex-col items-start justify-end gap-[18px] xl:top-auto xl:right-auto xl:bottom-[26px] xl:left-6 xl:h-auto xl:w-[440px] ${TEXT_ARRIVAL}`;
  return <span className={classes}>{children}</span>;
}

/** The open slice's title treatment (240 × 80), or its name when it has none */
// Each place keeps its own look on purpose; don't unify them.
export const SLICE_TITLE: TitleTreatmentLook = {
  box: 'relative block h-20 w-60 max-w-full',
  logo: `${TITLE_LOGO_FIT} drop-shadow-[0_2px_12px_rgb(0_0_0/0.45)]`,
  sizes: '240px',
  text: 'line-clamp-2 font-display text-title-1 drop-shadow-[0_2px_12px_rgb(0_0_0/0.45)]',
};

export function SliceFacts({
  facts,
}: Readonly<{ facts: ReadonlyArray<Fact> }>) {
  return (
    <MetaRow className="min-w-0 flex-wrap gap-x-4 xl:flex-nowrap">
      {facts.map((fact) => (
        <MetaItem icon={FACT_ICON[fact.kind]} key={fact.kind}>
          {fact.text}
        </MetaItem>
      ))}
    </MetaRow>
  );
}

/** A top corner of the open slice (the ⋯ on the right), shown only while it is open */
export function SliceCorner({
  children,
  side,
}: Readonly<{ children: ReactNode; side: 'left' | 'right' }>) {
  // the right one sits on the open slice's right edge: it leaves at once
  // on closing (it would jump to the narrow slice's edge) and fades in after
  // the slice has opened
  const place =
    side === 'left'
      ? 'left-4 duration-200'
      : 'right-4 duration-0 group-data-[open=true]/fv:delay-150';
  const classes = `invisible absolute top-4 ${place} z-3 opacity-0 transition-[opacity,visibility] group-data-[open=true]/fv:visible group-data-[open=true]/fv:opacity-100 group-data-[open=true]/fv:duration-300`;
  return <span className={classes}>{children}</span>;
}
