'use client';

import { useEffect, useState } from 'react';

import { useShowMorphTarget } from '@/components/ui/tile/showMorph';
import { showMorphName } from '@/components/ui/tile/showMorphNames';
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
 * it (named from its first render); the transition itself is started by the show page's
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
  // the card's logo glides into this one: named from the first render, so
  // the browser's snapshot of the new page has it, then unnamed so no later
  // transition on the page picks it up
  const [handOff, setHandOff] = useState(morph);
  useEffect(() => {
    if (!handOff) {
      return;
    }
    const done = window.setTimeout(() => setHandOff(false), MORPH_NAME_MS);
    return () => window.clearTimeout(done);
  }, [handOff]);
  const morphName =
    handOff && src ? showMorphName('logo', seriesId) : undefined;
  return (
    <TitleTreatment
      as="h1"
      draggable={false}
      loading="eager"
      look={HERO_TITLE}
      morphName={morphName}
      src={src}
      title={title}
    />
  );
}
