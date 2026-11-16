import type { PickItem } from '@tvseri.es/schemas';

import { tagGlyph, variantBuildingGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import PosterTile from '@/components/ui/tile/PosterTile';

import { type ReasonLine, reasonLine } from './copy';

const GLYPH: Readonly<Record<ReasonLine['kind'], typeof tagGlyph>> = {
  genre: tagGlyph,
  network: variantBuildingGlyph,
  theme: tagGlyph,
};

/** A pick's column and its reason line (it may wrap): shared with the placeholder */
export const LIKED_PICK = 'w-[140px] shrink-0 md:w-[150px]';
export const LIKED_REASON = 'flex items-start gap-1.5 text-meta text-white/60';

/**
 * One show like it (HMFinal `e2-bri`): the poster and why it's here, with
 * the board's icon per reason (building for the network, tag for a theme or
 * genres). The reason may wrap to a second line instead of being cut.
 */
export default function LikedPick({ item }: Readonly<{ item: PickItem }>) {
  const { series } = item;
  const reason = reasonLine(item);
  return (
    <li className={LIKED_PICK}>
      <PosterTile
        id={series.id}
        poster={series.posterImage}
        sizes="150px"
        slug={series.slug}
        title={series.title}
      >
        {reason ? (
          <p className={LIKED_REASON}>
            <Icon
              className="mt-[3px] shrink-0"
              glyph={GLYPH[reason.kind]}
              size={13}
            />
            <span>{reason.text}</span>
          </p>
        ) : null}
      </PosterTile>
    </li>
  );
}
