import {
  arrowDownGlyph,
  arrowUpGlyph,
  moveBottomGlyph,
  moveTopGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';

export type Move = Readonly<{ glyph: Glyph; label: string; to: number }>;

/** The Move menu's rows for the service at `index` of `count`: only the ones that move it */
export function movesFor(index: number, count: number): ReadonlyArray<Move> {
  const last = count - 1;
  return [
    ...(index > 1
      ? [{ glyph: moveTopGlyph, label: 'Move to top', to: 0 }]
      : []),
    ...(index > 0
      ? [{ glyph: arrowUpGlyph, label: 'Move up', to: index - 1 }]
      : []),
    ...(index < last
      ? [{ glyph: arrowDownGlyph, label: 'Move down', to: index + 1 }]
      : []),
    ...(index < last - 1
      ? [{ glyph: moveBottomGlyph, label: 'Move to bottom', to: last }]
      : []),
  ];
}
