import { GLASS } from '@/components/ui/glass/glass';
import {
  bookmarkGlyph,
  completeGlyph,
  eyeGlyph,
  heartGlyph,
  sparkleGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import SharedRelationPill, {
  type RelationPillLayout,
} from '@/components/ui/relation/RelationPill';
import { RELATION_LABEL, type Relation } from './favouriteFacts';

const ICON: Readonly<Record<Relation, Glyph | ToggleGlyph>> = {
  'both-love': heartGlyph,
  new: sparkleGlyph,
  seen: completeGlyph,
  watching: eyeGlyph,
  watchlist: bookmarkGlyph,
};

const TONE: Readonly<Record<Relation, string>> = {
  'both-love':
    'bg-[rgb(143_220_90/0.2)] text-[#c9f2ad] shadow-[inset_0_0_0_1px_rgb(143_220_90/0.4),0_0_14px_rgb(143_220_90/0.18)]',
  new: 'bg-[rgb(143_220_90/0.14)] text-[#b9ec95] shadow-[inset_0_0_0_1px_rgb(143_220_90/0.22)]',
  seen: 'bg-white/5 text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]',
  watching:
    'bg-white/5 text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]',
  watchlist:
    'bg-white/5 text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]',
};

/** Each place keeps its own look on purpose; don't unify them. */
const PILL: RelationPillLayout = {
  icon: 13,
  pill: 'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-caption font-medium backdrop-blur-[12px]',
};

/**
 * The visitor's one pill per favourite: what the show is to
 * you, strongest first. "New to you" is green with the sparkle at every
 * level; "You both love this" glows.
 */
export default function RelationPill({
  relation,
}: Readonly<{ relation: Relation }>) {
  const label = RELATION_LABEL[relation];
  const glass = relation === 'new' || relation === 'both-love' ? '' : GLASS;
  const tone = `${TONE[relation]} ${glass}`;
  const icon = ICON[relation];
  return (
    <SharedRelationPill glyph={icon} label={label} layout={PILL} tone={tone} />
  );
}
