import {
  calendarGlyph,
  variantBuildingGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import PosterTile from '@/components/ui/tile/PosterTile';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import type { HubShow } from '../_data/hubShow';

const FACT_GLYPH = { network: variantBuildingGlyph } as const;

/**
 * A poster in the hub's rows: the poster, its
 * title and a caption line (the year, and the network where a row names it). Phones draw the
 * poster alone.
 */
export default function HubPoster({
  loading,
  show,
}: Readonly<{ loading?: 'eager' | 'lazy'; show: HubShow }>) {
  const overlay = <WatchedOverlay id={show.id} />;
  return (
    <PosterTile
      id={show.id}
      loading={loading}
      overlay={overlay}
      poster={show.poster}
      slug={show.slug}
      title={show.title}
    >
      <div className="flex min-w-0 flex-col gap-2 max-md:hidden">
        <span className="truncate text-body-sm font-semibold text-white">
          {show.title}
        </span>
        <MetaRow className="gap-3 text-caption">
          <MetaItem icon={calendarGlyph} iconSize={12}>
            {show.year ?? ''}
          </MetaItem>
          {show.fact && show.factGlyph ? (
            <MetaItem icon={FACT_GLYPH[show.factGlyph]} iconSize={12} shrink>
              {show.fact}
            </MetaItem>
          ) : null}
        </MetaRow>
      </div>
    </PosterTile>
  );
}
