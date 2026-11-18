'use client';

import CircleButton from '@/components/ui/button/CircleButton';
import { watchlistGlyph } from '@/components/ui/button/PosterCircle';
import { useListToggle } from '@/lib/marking/toggles';

/**
 * A show to the VIEWER's own watchlist from someone else's profile: the
 * toggle and the button's name ("Add X to my watchlist", "X is on my
 * watchlist" while it is there).
 */
export function useWatchlistAdd(seriesId: number, title: string) {
  const { isOn, toggle } = useListToggle(seriesId, 'watchlist');
  const label = isOn
    ? `${title} is on my watchlist`
    : `Add ${title} to my watchlist`;
  return { isOn, label, toggle };
}

/**
 * The visitor's + (the hero, an Also watching row, a New to
 * you poster, a History row): a check while the show is saved. `className`
 * places it and gives it its ground where it sits on a picture.
 */
export default function WatchlistAdd({
  className,
  seriesId,
  title,
}: Readonly<{ className?: string; seriesId: number; title: string }>) {
  const { isOn, label, toggle } = useWatchlistAdd(seriesId, title);
  const icon = watchlistGlyph(isOn);
  return (
    <CircleButton
      className={className}
      data-on={isOn}
      icon={icon}
      label={label}
      onClick={toggle}
      pressed={isOn}
    />
  );
}
