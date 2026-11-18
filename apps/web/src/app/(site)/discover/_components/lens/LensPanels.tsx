import Link from 'next/link';

import {
  calendarGlyph,
  globeGlyph,
  languageGlyph,
  tagGlyph,
  variantBuildingGlyph,
  variantHourglassGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import { isUnavailable } from '@/lib/cache/unavailable';
import { LENS_KEYS, LENS_LABELS, type LensKey } from '../../_data/hubTiles';
import { getLensPanels } from '../../_data/lenses';
import type { LensTileView } from '../../_data/lensModel';
import { LensGridFailed } from './LensGridSkeleton';
import LensPanel from './LensPanel';
import LensTileBody from './LensTileBody';
import LensTileButton from './LensTileButton';
import { lensTileStyles } from './tileStyles';

const CALM_GLYPH: Readonly<Record<LensKey, Glyph>> = {
  country: globeGlyph,
  decade: calendarGlyph,
  duration: variantHourglassGlyph,
  language: languageGlyph,
  network: variantBuildingGlyph,
  theme: tagGlyph,
};

function LensTile({
  first,
  lens,
  tile,
}: Readonly<{ first: boolean; lens: LensKey; tile: LensTileView }>) {
  const calm = tile.look.kind === 'calm';
  // the default lens is above the fold on a hard load
  const loading = lens === 'duration' ? 'eager' : 'lazy';
  const body = (
    <LensTileBody
      calmGlyph={CALM_GLYPH[lens]}
      first={first}
      loading={loading}
      tile={tile}
    />
  );
  if (tile.action.kind === 'open') {
    return (
      <LensTileButton
        calm={calm}
        first={first}
        label={tile.name}
        row={tile.action.row}
      >
        {body}
      </LensTileButton>
    );
  }
  const className = lensTileStyles({ calm, first });
  return (
    <Link aria-label={tile.name} className={className} href={tile.action.href}>
      {body}
    </Link>
  );
}

/** The six lenses' grids, all rendered; the tabs pick the one shown */
export default async function LensPanels() {
  const panels = await getLensPanels();
  return LENS_KEYS.map((lens) => {
    const tiles = panels[lens];
    return (
      <LensPanel key={lens} lens={lens}>
        {isUnavailable(tiles) ? (
          <LensGridFailed title={LENS_LABELS[lens]} />
        ) : (
          tiles.map((tile, index) => {
            const first = index === 0;
            return (
              <LensTile first={first} key={tile.key} lens={lens} tile={tile} />
            );
          })
        )}
      </LensPanel>
    );
  });
}
