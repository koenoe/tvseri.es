'use client';

import type { MouseEvent } from 'react';

import EyeButton from '@/components/marking/EyeButton';
import cn from '@/lib/cn';
import { nextKey, pressMark } from '@/lib/marking/pressGate';
import { useShowActions } from '@/lib/marking/showActions';
import { TILE_CIRCLE } from '../marking/RemoteMenuButton';

type Props = Readonly<{
  className?: string;
  /** `S02E02` */
  code: string;
  episode: number;
  /** the episode's title, for the toast ("Marked S02E02 Fallen") */
  episodeTitle?: string;
  season: number;
  seriesId: number;
  /** the show's title */
  title: string;
}>;

/**
 * The eye on Continue watching (the shared `EyeButton` in
 * the tile's transparent look): marks this episode watched, Just now,
 * through the marking core (its toast and Undo). It only marks: no pressed
 * state, no burst. Hover and focus fetch the show's marking state ahead of
 * the click.
 */
export default function MarkEye({
  className,
  code,
  episode,
  episodeTitle,
  season,
  seriesId,
  title,
}: Props) {
  const { markEpisodeWatched, prepare } = useShowActions();
  const label = `Mark ${title} ${code} as watched`;
  // the row moves on to the next episode in the same spot: one press, one mark
  const mark = (event: MouseEvent<HTMLButtonElement>) => {
    pressMark(nextKey(seriesId), event, () =>
      markEpisodeWatched({ episode, episodeTitle, season, seriesId, title }),
    );
  };
  const warm = () => prepare(seriesId);
  const classes = cn(TILE_CIRCLE, className);
  return (
    <EyeButton
      className={classes}
      label={label}
      onIntent={warm}
      onPress={mark}
    />
  );
}
