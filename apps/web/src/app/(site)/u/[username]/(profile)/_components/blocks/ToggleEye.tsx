'use client';

import type { MouseEvent } from 'react';

import EyeButton from '@/components/marking/EyeButton';
import { nextKey, pressMark } from '@/lib/marking/pressGate';
import { useEpisodeToggle } from '@/lib/marking/toggles';
import useIntentSeed from '@/lib/marking/useIntentSeed';

/**
 * The eye on a profile lane row (the shared `EyeButton`): toggles the
 * episode through the marking core (optimistic, toast with Undo); outline
 * until watched, filled after (icons_final: outline = not watched), with
 * the burst when it turns on. The show is seeded on intent
 * (`useIntentSeed`), and a press before the seed lands draws pressed at once.
 */
export default function ToggleEye({
  code,
  episode,
  season,
  seriesId,
  title,
}: Readonly<{
  /** `S04E02`, for the label */
  code: string;
  episode: number;
  season: number;
  seriesId: number;
  title: string;
}>) {
  const ref = { episodeNumber: episode, seasonNumber: season };
  const { isWatched, toggle } = useEpisodeToggle(seriesId, ref, { title });
  const { intent, pending, run } = useIntentSeed(seriesId);
  // a lane row moves on to the show's next episode in the same spot: one
  // press, one write
  const onPress = (event: MouseEvent<HTMLButtonElement>) => {
    pressMark(nextKey(seriesId), event, () => run(toggle));
  };
  const label = isWatched
    ? `Unmark ${title} ${code}`
    : `Mark ${title} ${code} as watched`;
  const hint = isWatched ? 'Watched' : 'Mark as watched';
  return (
    <EyeButton
      label={label}
      onIntent={intent}
      onPress={onPress}
      onTouchIntent={intent}
      pressed={isWatched || pending}
      title={hint}
    />
  );
}
