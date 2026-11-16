import type { ReactNode } from 'react';

import { checkGlyph, plusGlyph } from '@/components/ui/icon/glyphs';

/** The + of a watchlist circle, a check while the show is on the list */
export const watchlistGlyph = (isOn: boolean) =>
  isOn ? checkGlyph : plusGlyph;

/** A place's look: the circle off and on */
export type PosterCircleLook = Readonly<{ off: string; on: string }>;

/**
 * A round toggle in a poster's corner (the visitor's + on a Library tile,
 * the + on Stats' Popular unwatched): the place gives its look, its name
 * (`label`; `title` where it also shows as a tooltip), the glyph (`children`,
 * with any motion of its own) and what a press does.
 */
export default function PosterCircle({
  children,
  isOn,
  label,
  look,
  onClick,
  title,
}: Readonly<{
  children: ReactNode;
  isOn: boolean;
  label: string;
  look: PosterCircleLook;
  onClick: () => void;
  title?: string;
}>) {
  const className = isOn ? look.on : look.off;
  return (
    <button
      aria-label={label}
      aria-pressed={isOn}
      className={className}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}
