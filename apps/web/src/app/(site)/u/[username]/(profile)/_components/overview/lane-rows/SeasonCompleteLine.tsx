import ProgressTrack from '@/components/ui/progress/ProgressTrack';
import { formatRuntime } from '@/lib/format/duration';

/** "▬▬▬ 8 episodes · 7h 10m" under a Season complete row */
export default function SeasonCompleteLine({
  episodes,
  runtimeMinutes,
}: Readonly<{ episodes: number; runtimeMinutes: number | null }>) {
  const runtime = formatRuntime(runtimeMinutes);
  const label = `All ${episodes} episodes out, none watched`;
  return (
    <span className="flex items-center gap-4">
      <ProgressTrack
        aired={100}
        className="min-w-10 flex-1"
        label={label}
        watched={0}
      />
      <span className="shrink-0 whitespace-nowrap text-caption text-white/60 tabular-nums">
        <b className="font-medium text-white/80">{episodes} episodes</b>
        {runtime ? ` · ${runtime}` : null}
      </span>
    </span>
  );
}
