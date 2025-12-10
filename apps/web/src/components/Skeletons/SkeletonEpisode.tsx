import { episodeStyles } from '../Tiles/Episode';

export default function SkeletonEpisode() {
  return (
    <div className={episodeStyles()}>
      <div className="relative aspect-video">
        <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
      <div className="relative flex w-full flex-col gap-3 p-4 md:p-6">
        <div className="mb-1 h-6 w-4/5 bg-white/20" />
        <div className="flex w-full flex-col gap-1.5 xl:w-4/5 2xl:w-3/5">
          <div className="h-4 w-11/12 bg-white/20" />
          <div className="h-4 w-full bg-white/20" />
          <div className="h-4 w-10/12 bg-white/20" />
        </div>
        <div className="mt-3 flex h-3 w-2/6 bg-white/10" />
      </div>
    </div>
  );
}
