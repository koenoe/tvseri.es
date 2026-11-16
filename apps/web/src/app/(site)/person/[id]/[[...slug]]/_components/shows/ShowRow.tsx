import {
  clockGlyph,
  filmGlyph,
  micGlyph,
  seasonGlyph,
  userGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';

import type { ShowRowView } from '../../_lib/shows';
import RowMark from './RowMark';
import styles from './shows.module.css';

const ROW = cn(
  styles.row,
  'flex h-[61px] min-w-0 flex-col justify-center border-t border-white/6 transition-colors focus-visible:rounded-8 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70 lg:h-[57px] lg:px-2.5 lg:hover:bg-white/4',
);

/**
 * One show: the title and its
 * years, then one meta line: the role (the crew work in Behind the camera
 * or for crew-only credits), the episodes or, for announced work, when it
 * comes (pink), and signed in the viewer's mark. No hooks of its own, so the
 * server draws the list and the client draws the folded self credits alike.
 * The filter flags are data attributes (`shows.module.css`).
 */
export default function ShowRow({
  personId,
  row,
}: Readonly<{ personId: number; row: ShowRowView }>) {
  return (
    <TileLink
      className={ROW}
      data-crew={row.behind ? '' : undefined}
      data-crew-only={row.crewOnly ? '' : undefined}
      data-guest={row.guest ? '' : undefined}
      data-series={row.series ? '' : undefined}
      href={row.href}
    >
      <span className="flex min-w-0 items-baseline justify-between gap-2.5 lg:gap-3">
        <b className="truncate text-body-sm font-semibold">{row.name}</b>
        <span className="shrink-0 text-caption whitespace-nowrap text-white/60 tabular-nums">
          {row.years}
        </span>
      </span>
      <MetaRow className="-mt-0.5 gap-3">
        {row.crewOnly ? null : (
          <MetaItem
            className={styles.castRole}
            icon={row.voice ? micGlyph : userGlyph}
            iconSize={12}
            shrink
          >
            {row.role}
          </MetaItem>
        )}
        {row.crew ? (
          <MetaItem
            className={styles.crewRole}
            icon={filmGlyph}
            iconSize={12}
            shrink
          >
            {row.crew}
          </MetaItem>
        ) : null}
        {row.when ? (
          <MetaItem icon={clockGlyph} iconSize={12} tone="pink">
            {row.when}
          </MetaItem>
        ) : (
          <MetaItem icon={seasonGlyph} iconSize={12}>
            {row.episodes}
          </MetaItem>
        )}
        <RowMark personId={personId} seriesId={row.id} />
      </MetaRow>
    </TileLink>
  );
}
