import Button from '@/components/ui/button/Button';
import { trashGlyph } from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';

import { DANGER_BUTTON, MD_BUTTON } from '../../_lib/appButtons';
import { DataCard, DataRow } from './DataCard';
import { STATS_GRID, STATS_LABELS, Tile } from './DataStats';

const VALUE_BAR = `block w-20 animate-ghost rounded-4 text-transparent ${GHOST_FILL}`;
const DELETE_BUTTON = `${DANGER_BUTTON} ${MD_BUTTON}`;

/** The four tiles: their real labels, a bar for each number */
export function StatsSkeleton() {
  return (
    <div aria-hidden="true" className={STATS_GRID}>
      {STATS_LABELS.map((label) => (
        <Tile
          key={label}
          label={label}
          value={<span className={VALUE_BAR}>0</span>}
        />
      ))}
    </div>
  );
}

/**
 * The Delete account card as it is (everything on it is static; only the
 * dialog needs the username), with its button off until the hole arrives.
 */
export function DeleteSkeleton() {
  const action = (
    <Button
      className={DELETE_BUTTON}
      disabled
      icon={trashGlyph}
      variant="tonal"
    >
      Delete account
    </Button>
  );
  return (
    <div aria-hidden="true">
      <DataCard danger dot="bg-danger" title="Delete account">
        <DataRow action={action} title="Delete everything">
          Your profile, history, lists and Plex link. This can’t be undone.
        </DataRow>
      </DataCard>
    </div>
  );
}
