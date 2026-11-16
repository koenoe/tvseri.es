'use client';

import { useCallback, useState } from 'react';

import { textLinkStyles } from '@/components/ui/button/buttonStyles';
import { episodeLabel } from '@/lib/marking/copy';
import { useEpisodeRecord } from '@/lib/marking/hooks';
import type { EpisodeRef } from '@/lib/marking/types';

import { openPicker } from '../../_lib/dialogs';
import { useShow } from '../../_lib/ShowProvider';
import { type ChipState, isWatchedChip } from './chips';
import { chipStatus } from './status';

const LINK = textLinkStyles({ className: 'ml-auto shrink-0 text-caption' });

/**
 * The last chip touched: "S02E03 Sundae · Don’t
 * remember when · Change date" (Add a date when not watched).
 */
export default function DetailLine({
  airDate,
  episode,
  state,
  title,
}: Readonly<{
  episode: EpisodeRef;
  state: ChipState;
  title: string | undefined;
  airDate: string | undefined;
}>) {
  const show = useShow();
  const record = useEpisodeRecord(show.id, episode);
  const [now] = useState(Date.now);
  const name = episodeLabel(episode, title);
  const watched = isWatchedChip(state);
  const date = useCallback(() => {
    openPicker({
      kind: 'one',
      refs: [episode],
      seriesId: show.id,
      what: episodeLabel(episode, title),
    });
  }, [episode, show.id, title]);
  return (
    <div className="flex items-center gap-3 rounded-14 bg-black/20 px-4 py-3.5 text-meta">
      <b className="font-semibold">{name}</b>
      <span className="truncate text-white/60">
        {chipStatus(state, record, airDate, now)}
      </span>
      {state === 'na' ? null : (
        <button className={LINK} onClick={date} type="button">
          {watched ? 'Change date' : 'Add a date'}
        </button>
      )}
    </div>
  );
}
