import {
  bookmarkGlyph,
  clockGlyph,
  completeGlyph,
  flagGlyph,
  heartGlyph,
  hideGlyph,
  onAirGlyph,
  progressGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';

import type { TileFactKind } from './tileView';

/** Each tile fact's 13px glyph; `plain` has none */
export const FACT_GLYPH: Readonly<
  Record<TileFactKind, Glyph | ToggleGlyph | null>
> = {
  ended: flagGlyph,
  favourite: heartGlyph,
  finished: completeGlyph,
  hidden: hideGlyph,
  ongoing: onAirGlyph,
  plain: null,
  runtime: clockGlyph,
  seen: progressGlyph,
  watching: progressGlyph,
  watchlist: bookmarkGlyph,
};
