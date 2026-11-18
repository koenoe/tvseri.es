import type { MoreGenre } from '@tvseri.es/schemas';

import { bookmarkGlyph } from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import Row from '@/components/ui/row/Row';
import BackdropTile from '@/components/ui/tile/BackdropTile';

import ShowMeta from '../feature/ShowMeta';
import { watchlistShareLine } from './format';

/** The row header takes a plain glyph: the bookmark's outline (watchlist) */
const WATCHLIST_GLYPH: Glyph = { outline: bookmarkGlyph.outline };

/**
 * "More Sci-Fi & Fantasy": the 16:9 backdrop row of the
 * genre the viewer's watchlist leans to, "Half of your watchlist is …"
 * beside the title, and the moments' year · seasons · genre line under
 * each tile.
 */
export default function MoreGenreRow({ data }: Readonly<{ data: MoreGenre }>) {
  const { genre } = data;
  if (!genre) {
    return null;
  }
  const title = `More ${genre.name}`;
  const subtitle = watchlistShareLine(data.share, genre.name);
  return (
    <Row
      id="more-genre"
      look="home"
      name="more-genre"
      subtitle={subtitle}
      subtitleGlyph={WATCHLIST_GLYPH}
      tiles="backdrop"
      title={title}
    >
      {data.items.map((show) => (
        <BackdropTile
          backdrop={show.backdropImage}
          id={show.id}
          key={show.id}
          logo={show.titleTreatmentImage}
          slug={show.slug}
          title={show.title}
        >
          <ShowMeta series={show} />
        </BackdropTile>
      ))}
    </Row>
  );
}
