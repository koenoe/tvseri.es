import type { UpNextItem } from '@tvseri.es/schemas';

import ProgressTrack from '@/components/ui/progress/ProgressTrack';

import UpNextCaption from './UpNextCaption';
import { airedPercent, progressLabel, watchedPercent } from './upNextCopy';
import { UP_NEXT_PROGRESS } from './upNextLayout';

/** How far through the season: the 4px line and "1 of 8 watched · 1 to watch" */
export default function UpNextProgress({
  item,
}: Readonly<{ item: UpNextItem }>) {
  const { toWatch, watched } = progressLabel(item);
  const label = `${watched} · ${toWatch}`;
  return (
    <span className={UP_NEXT_PROGRESS}>
      <ProgressTrack
        aired={airedPercent(item)}
        label={label}
        watched={watchedPercent(item)}
      />
      <UpNextCaption lead={watched} rest={toWatch} />
    </span>
  );
}
