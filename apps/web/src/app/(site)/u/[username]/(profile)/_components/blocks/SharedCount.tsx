import { showGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';

import { sharedSeries } from '../visitor/match/levels';

/** "▭ 59 shared series": the count beside the level, in words, never as a score */
export default function SharedCount({ count }: Readonly<{ count: number }>) {
  return (
    <MetaItem
      className="gap-[5px] text-[12.5px] leading-5 font-medium text-white/70 tabular-nums"
      icon={showGlyph}
    >
      {sharedSeries(count)}
    </MetaItem>
  );
}
