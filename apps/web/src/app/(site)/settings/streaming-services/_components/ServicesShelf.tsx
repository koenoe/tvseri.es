'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { useState } from 'react';

import { arrowDownGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import ServicesList from './ServicesList';
import { SHELF_CARD_CLASS, SHELF_HEAD_CLASS } from './shelfLook';

const HEADING = 'your-services';

/**
 * "Your services": the selected ones as a ranked list (the cyan dot means
 * yours). Where to watch shows the highest one that streams a series, so
 * the order is the viewer's to set. One polite live region reads out
 * every move and removal.
 */
export default function ServicesShelf({
  onReorder,
  onToggle,
  popularTitle,
  selected,
}: Readonly<{
  onReorder: (order: ReadonlyArray<number>) => void;
  onToggle: (provider: WatchProvider) => void;
  /** "Popular in the United Kingdom": where the empty shelf points */
  popularTitle: string;
  selected: ReadonlyArray<WatchProvider>;
}>) {
  const [status, setStatus] = useState('');
  const count = selected.length;
  return (
    <section aria-labelledby={HEADING} className={SHELF_CARD_CLASS}>
      <div className={SHELF_HEAD_CLASS}>
        <span className="size-2 shrink-0 rounded-full bg-cyan" />
        <h3 className="text-body outline-none" id={HEADING} tabIndex={-1}>
          Your services
        </h3>
        <span className="text-meta text-white/60 tabular-nums">{count}</span>
      </div>
      {count > 0 ? (
        <ServicesList
          headingId={HEADING}
          onAnnounce={setStatus}
          onReorder={onReorder}
          onToggle={onToggle}
          selected={selected}
        />
      ) : (
        <p className="flex items-start gap-2.5 rounded-14 bg-white/3 p-[18px] text-meta text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
          <Icon className="mt-0.5 shrink-0" glyph={arrowDownGlyph} size={16} />
          <span>
            None yet. Add the ones you pay for from{' '}
            <b className="font-medium text-white">{popularTitle}</b> below.
          </span>
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </section>
  );
}
