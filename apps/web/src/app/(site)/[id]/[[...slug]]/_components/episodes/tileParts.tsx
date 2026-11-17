'use client';

import { formatDuration } from '@tvseri.es/utils';
import { useCallback } from 'react';

import { calendarGlyph, clockGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { EPISODE_TILE_HOVER } from '@/components/ui/tile/tileHover';
import { codeOf } from '@/lib/marking/progress';

import type { ShowEpisode } from '@/lib/series/seasonEpisodes';
import { openEpisode } from '../../_lib/urlState';
import { preloadEpisodeModal } from '../episode-modal/EpisodeModalIsland';
import { formatAirDate } from './format';

/**
 * The wall's tile surface: bg-white/5, shadow, 12px.
 * Hover (`tileHover`, more subtle than a border): no ring, no
 * grow; its still zooms 3% inside its frame.
 */
export const TILE = `relative overflow-hidden rounded-12 bg-white/5 shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1)] ${EPISODE_TILE_HOVER}`;

/** Still sizes for `next/image`: Focus (802px), a tile (392px), a thumb. */
export const STILL_SIZES = {
  focus: '(min-width: 1024px) 802px, 100vw',
  thumb: '128px',
  tile: '(min-width: 1024px) 392px, (min-width: 768px) 50vw, 100vw',
} as const;

/** The still's bottom fade under the pill. */
export function StillFade() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 -bottom-1 h-2/5 bg-linear-to-t from-black/60 to-transparent"
    />
  );
}

/**
 * Production's faded episode number in the corner (`.ep-tnum`), cut by the
 * tile's edge. Its overhang scales with the type (200px from md, 120px on
 * phones at 3/5 of it), so a phone's "1" isn't half gone.
 */
export function FadedNumber({ number }: Readonly<{ number: number }>) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-2.5 -bottom-4 font-bold text-[120px] leading-none opacity-[0.075] md:-right-4 md:-bottom-7 md:text-[200px]"
    >
      {number}
    </span>
  );
}

/** Air date · runtime. */
export function EpisodeMeta({ episode }: Readonly<{ episode: ShowEpisode }>) {
  const runtime = episode.runtime > 0 ? formatDuration(episode.runtime) : '';
  return (
    <MetaRow className="gap-3 md:gap-4">
      <MetaItem icon={calendarGlyph}>{formatAirDate(episode.airDate)}</MetaItem>
      <MetaItem icon={clockGlyph}>{runtime}</MetaItem>
    </MetaRow>
  );
}

/**
 * The whole tile is the target that opens the episode modal (`.ep-hit`);
 * the pill sits above it.
 */
export function OpenEpisodeHit({
  episode,
}: Readonly<{ episode: ShowEpisode }>) {
  const { episodeNumber, seasonNumber } = episode;
  const open = useCallback(
    () => openEpisode({ episodeNumber, seasonNumber }),
    [episodeNumber, seasonNumber],
  );
  return (
    <button
      aria-label={`Open ${codeOf(episode)} ${episode.title}`}
      className="absolute inset-0 z-2 cursor-pointer rounded-12 focus-visible:outline-offset-[-2px]"
      onClick={open}
      onFocus={preloadEpisodeModal}
      onPointerEnter={preloadEpisodeModal}
      type="button"
    />
  );
}
