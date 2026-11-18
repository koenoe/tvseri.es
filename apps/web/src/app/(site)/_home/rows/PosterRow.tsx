import type { TvSeries } from '@tvseri.es/schemas';

import type { Glyph } from '@/components/ui/icon/types';
import Row from '@/components/ui/row/Row';
import PosterTile from '@/components/ui/tile/PosterTile';

import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';

type Props = Readonly<{
  id: string;
  items: ReadonlyArray<TvSeries>;
  subtitle?: string;
  subtitleGlyph?: Glyph;
  title: string;
}>;

/** A plain poster row on home (Top Picks, Hidden gems), Watched labels on */
export default function PosterRow({ id, items, ...heading }: Props) {
  return (
    <Row id={id} look="home" name={id} {...heading}>
      {items.map((show) => (
        <PosterTile
          id={show.id}
          key={show.id}
          overlay={<WatchedOverlay id={show.id} />}
          poster={show.posterImage}
          slug={show.slug}
          title={show.title}
        />
      ))}
    </Row>
  );
}
