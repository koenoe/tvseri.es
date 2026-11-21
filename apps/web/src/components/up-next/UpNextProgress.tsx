import type { UpNextItem } from '@tvseri.es/schemas';

import ProgressTrack from '@/components/ui/progress/ProgressTrack';

import UpNextCaption from './UpNextCaption';
import { airedPercent, progressLabel, watchedPercent } from './upNextCopy';
import { UP_NEXT_PROGRESS } from './upNextLayout';

/**
 * How far through the season: the 4px line and "1 of 8 watched · 1 to
 * watch"; `slide` for a hero whose line slides as the viewer marks
 */
export default function UpNextProgress({
  item,
  slide,
}: Readonly<{ item: UpNextItem; slide?: boolean }>) {
  const { toWatch, watched } = progressLabel(item);
  const label = `${watched} · ${toWatch}`;
  const aired = airedPercent(item);
  const watchedShare = watchedPercent(item);
  return (
    <span className={UP_NEXT_PROGRESS}>
      <ProgressTrack
        aired={aired}
        label={label}
        slide={slide}
        watched={watchedShare}
      />
      <UpNextCaption lead={watched} rest={toWatch} />
    </span>
  );
}
