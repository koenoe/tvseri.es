import Link from 'next/link';

import MarkControl from '@/components/marking/MarkControl';
import CrossFade from '@/components/motion/CrossFade';
import {
  calendarGlyph,
  seasonGlyph,
  variantTvGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import showPath from '@/lib/routing/showPath';

import type { LandscapeShow } from '../_data/landscape';

type Show = Pick<
  LandscapeShow,
  'id' | 'kicker' | 'length' | 'network' | 'reason' | 'slug' | 'title' | 'year'
>;

/**
 * The selected show's words (the phone's sheet too): the
 * kicker (its rank), the title, year · network · length, the reason. No
 * rating block and no show-page circles: this is a decade page.
 */
export function DecadeCardText({
  show,
  titleId,
}: Readonly<{ show: Show; titleId?: string }>) {
  const href = showPath(show.id, show.slug);
  return (
    <div className="flex min-w-0 flex-col items-start">
      <p className="text-overline text-white/60 uppercase">{show.kicker}</p>
      <Link
        className="mt-2 text-title-3 text-white transition-colors hover:text-white/80"
        href={href}
        id={titleId}
      >
        {show.title}
      </Link>
      <MetaRow className="mt-2">
        <MetaItem icon={calendarGlyph}>{show.year}</MetaItem>
        <MetaItem icon={variantTvGlyph} shrink>
          {show.network}
        </MetaItem>
        <MetaItem icon={seasonGlyph}>{show.length}</MetaItem>
      </MetaRow>
      <p className="mt-3 text-body-sm text-white/80">{show.reason}</p>
    </div>
  );
}

type Actions = Readonly<{
  show: Pick<LandscapeShow, 'id' | 'length' | 'slug' | 'title'>;
  states: ControlStatesRead;
}>;

/** The Watchlist + Seen it control for the selected show, in the viewer's state */
export function DecadeCardActions({ show, states }: Actions) {
  const mark = {
    href: showPath(show.id, show.slug),
    id: show.id,
    seasons: show.length,
    title: show.title,
  };
  return (
    <div className="flex items-center pt-1">
      <MarkControl look="decade" show={mark} states={states} />
    </div>
  );
}

/**
 * Under the treemap on desktop: the card for the selected tile. The card
 * stays; a newly picked show's words cross-fade in its place (`CrossFade`)
 */
export default function DecadeCard({
  show,
  states,
}: Readonly<{ show: Show; states: ControlStatesRead }>) {
  return (
    <div
      aria-live="polite"
      className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-8 rounded-16 bg-white/4 px-8 py-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] max-md:hidden"
      data-slot="decade-card"
    >
      <CrossFade frame="min-w-0" swapKey={show.id}>
        <DecadeCardText show={show} />
      </CrossFade>
      <DecadeCardActions show={show} states={states} />
    </div>
  );
}
