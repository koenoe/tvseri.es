import type { BecauseYouWatched, PickReason } from '@tvseri.es/schemas';

import {
  networkGlyph,
  tagGlyph,
  variantBurstGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import Row from '@/components/ui/row/Row';
import PosterTile from '@/components/ui/tile/PosterTile';

import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import { becauseSubtitle, reasonLine } from './format';

/** The icon per reason: network, tag, sparkle */
const REASON_GLYPH: Readonly<Record<PickReason['kind'], Glyph>> = {
  keyword: tagGlyph,
  network: networkGlyph,
  recommendation: variantBurstGlyph,
};

/**
 * "Because you watched Severance": the shared poster
 * row, "Your favourite, minus what you've seen" beside the title, and under
 * each poster why it is here ("Apple TV, like Severance").
 */
export default function BecauseYouWatchedRow({
  data,
}: Readonly<{ data: BecauseYouWatched }>) {
  const { source } = data;
  if (!source) {
    return null;
  }
  const title = `Because you watched ${source.title}`;
  const subtitle = becauseSubtitle(source.from);
  return (
    <Row
      id="because-you-watched"
      look="home"
      name="because-you-watched"
      subtitle={subtitle}
      title={title}
    >
      {data.items.map(({ reason, series }) => {
        const line = reasonLine(reason, source.title);
        const glyph = REASON_GLYPH[reason.kind];
        return (
          <PosterTile
            id={series.id}
            key={series.id}
            overlay={<WatchedOverlay id={series.id} />}
            poster={series.posterImage}
            slug={series.slug}
            title={series.title}
          >
            <MetaRow>
              <MetaItem icon={glyph} shrink>
                {line}
              </MetaItem>
            </MetaRow>
          </PosterTile>
        );
      })}
    </Row>
  );
}
