import type { ReactNode } from 'react';
import { APP_TILE_CLASS } from '@/components/brand/AppTile';
import { ButtonFace, FLAT, Ghost } from '@/components/ui/ghost/ghosts';
import { chevronDownGlyph } from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { APP_CARD_CLASS } from './AppCard';
import AppHeader from './AppHeader';
import { APP_PILL_CLASS } from './AppPill';
import { APP_TOGGLE_CLASS } from './layout';
import { STATUS_GHOST } from './StatusGhost';

/** A card's box as one flat pulsing layer: no brand edge, no tinted panel */
export const APP_CARD_GHOST_CLASS = cn(
  APP_CARD_CLASS,
  'animate-ghost',
  GHOST_FILL,
);

/** A pill as its label's box, words hidden */
export const PILL_GHOST = cn(APP_PILL_CLASS, FLAT);

/**
 * An app card's header while its status loads, on `AppHeader`'s grid.
 * Fixed status copy is drawn as text so the header keeps its height;
 * otherwise a line.
 */
export default function AppHeaderGhost({
  name,
  pills,
  status = STATUS_GHOST,
  toggle,
}: Readonly<{
  name: string;
  pills: ReadonlyArray<string>;
  status?: ReactNode;
  /** The toggle's label: Hide on the open card, Open on a closed one */
  toggle: 'Hide' | 'Open';
}>) {
  const pillGhosts = pills.map((pill) => (
    <span className={PILL_GHOST} key={pill}>
      {pill}
    </span>
  ));
  const tile = <Ghost className={APP_TILE_CLASS} />;
  return (
    <AppHeader name={name} pills={pillGhosts} status={status} tile={tile}>
      <ButtonFace
        className={APP_TOGGLE_CLASS}
        size="md"
        trailingIcon={chevronDownGlyph}
        variant="tonal"
      >
        {toggle}
      </ButtonFace>
    </AppHeader>
  );
}
