'use client';

import TitleTreatment, {
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';

import { useHeroTitleDraft } from '../admin/heroDraft';
import { HERO_TITLE_SPACE } from './heroLayout';

/**
 * The show's title treatment (500×160, bottom-left), else the title in the
 * display style (240×40). The logo fills its box like `fill`
 * would; its intrinsic size is the box at 2×: the TMDB loader then shows it
 * honours the width (the API's w500 is what a 500px box loads at 1×), and
 * srcset still follows `sizes`.
 */
// Each place keeps its own look on purpose; don't unify them.
const HERO_TITLE: TitleTreatmentLook = {
  box: cn(HERO_TITLE_SPACE, 'relative h-10 w-[240px] md:h-40 md:w-[500px]'),
  height: 320,
  logo: 'absolute inset-0 size-full object-contain object-bottom-left',
  sizes: '(min-width: 768px) 500px, 240px',
  text: cn(HERO_TITLE_SPACE, 'max-w-[973px] font-display text-display'),
  width: 1000,
};

/** The hero's title; while an admin picks images, their live pick */
export default function HeroTitle({
  logo,
  seriesId,
  title,
}: Readonly<{ logo?: string; seriesId: number; title: string }>) {
  const draft = useHeroTitleDraft(seriesId, logo);
  const src = draft ? (draft.kind === 'logo' ? draft.url : undefined) : logo;
  return (
    <TitleTreatment
      as="h1"
      draggable={false}
      loading="eager"
      look={HERO_TITLE}
      src={src}
      title={title}
    />
  );
}
