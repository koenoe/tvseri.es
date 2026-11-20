'use client';

import { type ReactNode, useLayoutEffect, useRef } from 'react';

import {
  showMorphClass,
  showMorphName,
  useShowMorphTarget,
} from '@/components/ui/tile/showMorph';
import TitleTreatment, {
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';

import { useHeroTitleDraft } from '../admin/heroDraft';
import { HERO_TITLE_SPACE } from './heroLayout';

/**
 * The show's title treatment (bottom-left: 300×80 on phones, 500×160 from
 * md, the same shape so logos scale alike), else the title in the display
 * style. The logo fills its box like `fill`
 * would; its intrinsic size is the box at 2×: the TMDB loader then shows it
 * honours the width (the API's w500 is what a 500px box loads at 1×), and
 * srcset still follows `sizes`.
 */
/** Longer than the hand-off (360ms) and its start */
const MORPH_NAME_MS = 1000;

// Each place keeps its own look on purpose; don't unify them.
const HERO_TITLE: TitleTreatmentLook = {
  box: cn(HERO_TITLE_SPACE, 'relative h-20 w-[300px] md:h-40 md:w-[500px]'),
  height: 320,
  logo: 'absolute inset-0 size-full object-contain object-bottom-left',
  sizes: '(min-width: 768px) 500px, 300px',
  text: cn(HERO_TITLE_SPACE, 'max-w-[973px] font-display text-display'),
  width: 1000,
};

/**
 * The hero's title; while an admin picks images, their live pick. Opened
 * from a card that hands over (`showMorph.ts`), the card's logo glides into
 * it (`MorphTarget`); the transition itself is started by the show page's
 * route boundary (`page.tsx`).
 */
export default function HeroTitle({
  logo,
  seriesId,
  title,
}: Readonly<{ logo?: string; seriesId: number; title: string }>) {
  const draft = useHeroTitleDraft(seriesId, logo);
  const morph = useShowMorphTarget(seriesId);
  const src = draft ? (draft.kind === 'logo' ? draft.url : undefined) : logo;
  const treatment = (
    <TitleTreatment
      as="h1"
      draggable={false}
      loading="eager"
      look={HERO_TITLE}
      src={src}
      title={title}
    />
  );
  return morph && src ? (
    <MorphTarget seriesId={seriesId}>{treatment}</MorphTarget>
  ) : (
    treatment
  );
}

/**
 * The logo's half of the hand-off: the card's logo (named at the click) and
 * this one share a name, so the browser glides one into the other. Named in
 * a layout effect, inside React's view-transition update, before the new
 * page is captured; the wrapper has no box, so the layout is the page's.
 */
function MorphTarget({
  children,
  seriesId,
}: Readonly<{ children: ReactNode; seriesId: number }>) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const logo = box.current?.firstElementChild;
    if (!(logo instanceof HTMLElement)) {
      return;
    }
    logo.style.setProperty(
      'view-transition-name',
      showMorphName('logo', seriesId),
    );
    logo.style.setProperty('view-transition-class', showMorphClass('logo'));
    // named for the hand-off only: never for a later transition on the page
    const unname = window.setTimeout(() => {
      logo.style.removeProperty('view-transition-name');
      logo.style.removeProperty('view-transition-class');
    }, MORPH_NAME_MS);
    return () => window.clearTimeout(unname);
  }, [seriesId]);
  return (
    <span className="contents" ref={box}>
      {children}
    </span>
  );
}
