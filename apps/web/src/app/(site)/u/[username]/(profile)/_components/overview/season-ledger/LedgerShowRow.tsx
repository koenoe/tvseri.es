import { plural } from '@tvseri.es/utils';
import Image from 'next/image';
import { ringGlyph, seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import showPath from '@/lib/routing/showPath';
import { LEDGER_SHOW_ROW, LEDGER_SHOW_TEXT } from './ledgerLayout';

import { missingLabel, type moreHoles } from './ledgerLines';
import type { LedgerView } from './loadLedger';

/** The show being checked: poster, title, "26 seasons", "3 episodes missing" */
export default function LedgerShowRow({
  more,
  open,
  view,
}: Readonly<{
  /** the holes the card does not list: "+20 more" opens the show's history */
  more: ReturnType<typeof moreHoles>;
  open: number;
  view: LedgerView;
}>) {
  const href = showPath(view.seriesId, view.slug);
  const historyHref = more ? `${href}?season=${more.season}&history` : href;
  const seasons = plural(view.seasonCount, 'season');
  return (
    <div className={LEDGER_SHOW_ROW}>
      <TileLink
        aria-label={view.title}
        className="shrink-0"
        href={href}
        tabIndex={-1}
      >
        <span className="image-rim relative block aspect-2/3 w-10 overflow-hidden rounded-6 bg-white/8 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.8)]">
          {view.posterImage ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="40px"
              src={view.posterImage}
            />
          ) : null}
        </span>
      </TileLink>
      <span className={LEDGER_SHOW_TEXT}>
        <span className="flex min-w-0 items-baseline gap-3">
          <TileLink
            className="min-w-0 truncate text-body-sm font-semibold hover:underline"
            href={href}
            title={view.title}
          >
            {view.title}
          </TileLink>
          {more ? (
            <TileLink
              className="shrink-0 whitespace-nowrap text-meta text-white/60 hover:text-white hover:underline"
              href={historyHref}
              title="Open the rest in the series’ history"
            >
              +{more.count} more
            </TileLink>
          ) : null}
        </span>
        <MetaRow fit="drop" numbers="tabular">
          <MetaItem icon={seasonGlyph}>{seasons}</MetaItem>
          <MetaItem icon={ringGlyph}>{missingLabel(open)}</MetaItem>
        </MetaRow>
      </span>
    </div>
  );
}
