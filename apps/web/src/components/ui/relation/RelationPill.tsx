import Icon from '@/components/ui/icon/Icon';
import type { Glyph, IconSize, ToggleGlyph } from '@/components/ui/icon/types';

/** One place's look for the pill: its classes, its icon and its label's */
export type RelationPillLayout = Readonly<{
  icon: IconSize;
  /** the label's own classes (a truncating label); none for a plain one */
  label?: string;
  pill: string;
}>;

/**
 * What a show is to the person looking (Seen it, Watching, Watchlist, New to
 * you, You both love this): an icon and the label on the place's pill.
 * Presentational: the place picks the glyph and the tone for the relation
 * (the profile's Favourites and the library draw them differently) and puts
 * the pill where it goes.
 */
export default function RelationPill({
  glyph,
  label,
  layout,
  tone,
}: Readonly<{
  glyph: Glyph | ToggleGlyph;
  label: string;
  layout: RelationPillLayout;
  /** the relation's colours (and glass) */
  tone: string;
}>) {
  // joined, not merged: a tone's glass and its fill both apply
  const classes = `${layout.pill} ${tone}`;
  return (
    <span className={classes} title={label}>
      <Icon className="shrink-0" glyph={glyph} size={layout.icon} />
      <span className={layout.label}>{label}</span>
    </span>
  );
}
