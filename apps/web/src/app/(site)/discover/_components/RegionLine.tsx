'use client';

import { globeGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import { regionLine } from '@/lib/region/regionLine';
import { useRegion } from '@/lib/region/useRegion';

/*
 * Until React knows the region, the slot draws the line from the pre-paint
 * hint (`lib/region/regionHint`): `--region-line` holds its text and
 * `data-region` on <html> says whose it is. `stored` (this viewer's, from
 * an earlier visit): the line itself, so React's line replaces it with the
 * same text and nothing moves. `guess` (first visit: the browser language's
 * country) or no hint: the item is laid out invisibly (icon and text) and
 * one pulsing bar covers all of it, from the icon's left edge like the line
 * that replaces it and the "Updated" bar beside it.
 */
// Literal classes (Tailwind reads them from the source): `[:root[data-region=stored]_&]` is the stored state
const SLOT =
  'relative invisible before:visible before:absolute before:inset-x-0 before:top-1/2 before:h-3 before:-translate-y-1/2 before:rounded-4 before:bg-white/5 before:animate-ghost [:root[data-region=stored]_&]:visible [:root[data-region=stored]_&]:before:hidden';
const TEXT =
  "inline-block align-middle after:content-[var(--region-line,'Streaming_in_the_United_States')]";

const PLACEHOLDER = (
  <MetaItem className={SLOT} icon={globeGlyph} tone="highlight">
    <span aria-hidden="true" className={TEXT} />
  </MetaItem>
);

/**
 * "Streaming in the United Kingdom": the viewer's saved country, else where
 * the request comes from (`/api/region`). A client piece, so the Discover
 * page stays fully static and no view runs a function for it; drawn before
 * first paint from the second visit on, so "Updated" after it never moves.
 */
export default function RegionLine() {
  const region = useRegion();
  if (!region) {
    return PLACEHOLDER;
  }
  return (
    <MetaItem icon={globeGlyph} tone="highlight">
      {regionLine(region)}
    </MetaItem>
  );
}
