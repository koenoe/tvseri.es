'use client';

import * as m from 'motion/react-m';
import { useState } from 'react';

import PosterCircle, {
  watchlistGlyph,
} from '@/components/ui/button/PosterCircle';
import { LIBRARY_POSTER_CIRCLE } from '@/components/ui/button/posterCircleLooks';
import {
  bookmarkGlyph,
  checkGlyph,
  eyeGlyph,
  heartGlyph,
  progressGlyph,
  sparkleGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import RelationPill, {
  type RelationPillLayout,
} from '@/components/ui/relation/RelationPill';
import cn from '@/lib/cn';
import { useLibrarySelect } from '@/lib/marking/hooks';

import { useWatchlistAdd } from '../../_components/blocks/WatchlistAdd';
import { RELATION_LABEL, type Relation, relationOf } from '../../_lib/relation';

/** Watching: the 4px line on the poster (`.pl`): aired dimmed, watched white */
export function ProgressLine({
  aired,
  watched,
}: Readonly<{ aired: number; watched: number }>) {
  const airedStyle = { width: `${aired}%` };
  const watchedStyle = { width: `${watched}%` };
  return (
    <>
      <span className="absolute inset-x-0 bottom-0 h-2/5 rounded-b-[inherit] bg-linear-to-t from-[rgb(15_20_20/0.85)] to-transparent" />
      <span className="absolute inset-x-2 bottom-2 z-1 h-1 overflow-hidden rounded-2 bg-white/18">
        <span
          className="absolute inset-y-0 left-0 bg-white/40"
          style={airedStyle}
        />
        <span
          className="absolute inset-y-0 left-0 rounded-2 bg-white"
          style={watchedStyle}
        />
      </span>
    </>
  );
}

/** Favourites: the heart on the poster (`.fav`) */
export function HeartBadge() {
  return (
    <span className="absolute top-2 left-2 z-2 flex size-[26px] items-center justify-center rounded-full bg-[rgb(15_20_20/0.6)] text-white">
      <Icon active glyph={heartGlyph} size={13} />
    </span>
  );
}

/** Select mode's circle (`.ck`): ringed, white with a check when picked */
export function CheckCircle({ picked }: Readonly<{ picked: boolean }>) {
  return (
    <m.span
      animate={{ opacity: 1, scale: 1 }}
      aria-hidden="true"
      className={cn(
        'absolute top-2 left-2 z-3 flex size-[26px] items-center justify-center rounded-full',
        picked
          ? 'bg-white text-[#171717]'
          : 'bg-[rgb(15_20_20/0.45)] text-transparent shadow-[inset_0_0_0_2px_rgb(255_255_255/0.75)]',
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <Icon glyph={checkGlyph} size={16} />
    </m.span>
  );
}

/** Each place keeps its own look on purpose; don't unify them. */
const PILL: RelationPillLayout = {
  icon: 11,
  label: 'truncate',
  pill: 'absolute bottom-2 left-2 z-2 inline-flex h-6 max-w-[calc(100%-16px)] items-center gap-[5px] rounded-full px-2 text-[11px] leading-5 font-semibold whitespace-nowrap',
};

const PILL_ICON: Readonly<Record<Relation, Glyph | ToggleGlyph>> = {
  'both-love': heartGlyph,
  new: sparkleGlyph,
  seen: eyeGlyph,
  watching: progressGlyph,
  watchlist: bookmarkGlyph,
};

const PILL_TONE: Readonly<Record<Relation, string>> = {
  'both-love':
    'bg-[rgb(36_52_24/0.9)] text-[#c9f2ad] shadow-[inset_0_0_0_1px_rgb(143_220_90/0.5)]',
  new: 'bg-[rgb(26_40_20/0.85)] text-[#b9ec95] shadow-[inset_0_0_0_1px_rgb(143_220_90/0.35)]',
  seen: 'bg-[rgb(15_20_20/0.75)] text-white/85',
  watching: 'bg-[rgb(15_20_20/0.75)] text-white/85',
  watchlist: 'bg-[rgb(15_20_20/0.75)] text-white/85',
};

/** The + on a show new to the visitor (`.tadd`): saves it to THEIR watchlist; a check while it is there */
export function AddToMine({
  id,
  title,
}: Readonly<{ id: number; title: string }>) {
  const { isOn, label, toggle } = useWatchlistAdd(id, title);
  return (
    <PosterCircle
      isOn={isOn}
      label={label}
      look={LIBRARY_POSTER_CIRCLE}
      onClick={toggle}
      title={label}
    >
      <m.span
        animate={{ opacity: 1 }}
        className="flex"
        initial={{ opacity: 0 }}
        key={isOn ? 'on' : 'off'}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        <Icon glyph={watchlistGlyph(isOn)} size={16} />
      </m.span>
    </PosterCircle>
  );
}

/**
 * A visitor's tile: one relation pill at the poster's
 * foot (`.rel`), and + on a show new to them. Drawn once the viewer's
 * library is known.
 */
export function VisitorOverlay({
  favourite,
  id,
  title,
}: Readonly<{ favourite: boolean; id: number; title: string }>) {
  // one answer per tile: a mark re-renders only the tiles it changes
  const relation = useLibrarySelect<Relation | null>(
    (ids) => relationOf(ids, id, { ownerFavourite: favourite }),
    null,
  );
  // + stays once offered: it turns into a check when the show is saved
  const [offered, setOffered] = useState(false);
  if (relation === 'new' && !offered) {
    setOffered(true);
  }
  if (!relation) {
    return null;
  }
  const label = RELATION_LABEL[relation];
  return (
    <>
      <RelationPill
        glyph={PILL_ICON[relation]}
        label={label}
        layout={PILL}
        tone={PILL_TONE[relation]}
      />
      {offered ? <AddToMine id={id} title={title} /> : null}
    </>
  );
}
