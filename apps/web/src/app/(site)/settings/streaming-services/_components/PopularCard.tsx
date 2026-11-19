import type { WatchProvider } from '@tvseri.es/schemas';
import type { ChangeEvent } from 'react';

import ExpandButton, {
  type ExpandLayout,
} from '@/components/ui/fold/ExpandButton';
import { searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import Dot from '@/components/ui/lane/Dot';
import cn from '@/lib/cn';

import InputShell, { INPUT_CLASS } from '../../_components/InputShell';
import type { Rest } from '../_lib/popular';
import ServiceTile from './ServiceTile';

/** The card's box, header and tile grid: the placeholder takes the same */
export const POPULAR_CARD_CLASS =
  'flex flex-col gap-6 rounded-16 bg-white/4 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]';
export const POPULAR_HEAD_CLASS = '-mb-2 flex flex-wrap items-center gap-3';
/** The dot and the title stay together; the title wraps before it leaves its dot */
export const POPULAR_TITLE_CLASS = 'flex min-w-0 items-center gap-3';
/** On a phone the filter takes its own row under the title, at the card's width */
export const POPULAR_FILTER_CLASS =
  'ml-auto h-10 w-70 gap-2.5 px-3 text-white/60 max-md:w-full';
export const POPULAR_GRID_CLASS =
  'grid grid-cols-3 gap-2.5 md:grid-cols-[repeat(7,minmax(0,1fr))] md:gap-3';
/** Folded on phones only: the tiles past the first 7 (`VISIBLE_RESTING`) hide there */
const PHONE_FOLDED = 'max-md:[&>:nth-child(n+8)]:hidden';
/** "Show all 16" / "Show fewer": the fold control every Show all uses (`FoldLabel`, the chevron turns) */
export const POPULAR_MORE_CLASS =
  '-mt-2 flex cursor-pointer items-center gap-1 self-start text-body-sm font-medium whitespace-nowrap text-white/80 transition-colors hover:text-white';
const POPULAR_MORE: ExpandLayout = {
  button: POPULAR_MORE_CLASS,
  chevron: 13,
};

/**
 * "Popular in the United Kingdom": the region's services that aren't selected
 * yet, a filter, and Show all / Show fewer.
 */
export default function PopularCard({
  label,
  onQuery,
  onToggle,
  onToggleAll,
  query,
  rest,
  showAll,
}: Readonly<{
  label: string;
  onQuery: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggle: (provider: WatchProvider) => void;
  onToggleAll: () => void;
  query: string;
  rest: Rest;
  showAll: boolean;
}>) {
  const grid = cn(POPULAR_GRID_CLASS, rest.phoneFolded && PHONE_FOLDED);
  const phoneOnly = rest.fold === 'phone' ? 'md:hidden' : undefined;
  const moreLabel = `Show all ${rest.total}`;
  return (
    <section aria-labelledby="popular-services" className={POPULAR_CARD_CLASS}>
      <div className={POPULAR_HEAD_CLASS}>
        <span className={POPULAR_TITLE_CLASS}>
          <Dot colour="bg-white/35" />
          <h3 className="text-body" id="popular-services">
            {label}
          </h3>
        </span>
        <InputShell className={POPULAR_FILTER_CLASS}>
          <Icon className="size-[15px]" glyph={searchGlyph} size={16} />
          <input
            aria-label="Filter services"
            autoComplete="off"
            className={INPUT_CLASS}
            onChange={onQuery}
            placeholder="Filter services"
            type="text"
            value={query}
          />
        </InputShell>
      </div>
      {rest.tiles.length === 0 ? (
        <p className="rounded-14 bg-white/3 p-[18px] text-meta text-white/60">
          No service matches. Try fewer letters.
        </p>
      ) : (
        <div className={grid}>
          {rest.tiles.map((provider) => (
            <ServiceTile
              key={provider.id}
              onToggle={onToggle}
              provider={provider}
            />
          ))}
        </div>
      )}
      {rest.fold === 'none' ? null : (
        <ExpandButton
          className={phoneOnly}
          label={moreLabel}
          layout={POPULAR_MORE}
          onClick={onToggleAll}
          open={showAll}
        />
      )}
    </section>
  );
}
