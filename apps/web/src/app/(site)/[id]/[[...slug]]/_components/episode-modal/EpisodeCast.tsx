'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { memo, useMemo } from 'react';

import { didNotLoad } from '@/components/ui/error/unavailableCopy';
import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL, GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { codeOf } from '@/lib/marking/progress';
import {
  guestFaces,
  starringFaces,
  toRollBlocks,
} from '@/lib/series/episodeCredits';
import CreditsRoll from './CreditsRoll';
import EpisodeFaces from './EpisodeFaces';
import { useEpisodeCredits } from './useEpisodeData';

type Props = Readonly<{
  seriesId: number;
  episode: EpisodeRef;
  /** The faces under the title, or the credits roll on the right. */
  part: 'faces' | 'roll';
}>;

const GHOST = {
  failed: `${GHOST_LOOK.failed} bg-black/20`,
  loading: `border-2 border-white/20 ${GHOST_FILL}`,
} as const;

const ghost = (count: number, size: string, look: keyof typeof GHOST) =>
  Array.from({ length: count }, (_, index) => (
    <span
      className={`${size} ${GHOST[look]} -mr-4 rounded-full max-lg:mr-0 max-lg:-ml-3 max-lg:size-[60px]`}
      key={index}
    />
  ));

/**
 * Holds the faces' space while the credits load (no shift when they land);
 * when they failed, dashed slots in the same space and one line.
 */
function FacesSkeleton({
  look = 'loading',
}: Readonly<{ look?: keyof typeof GHOST }>) {
  const frameClass = cn('flex flex-col gap-3', look === 'loading' && PULSE);
  return (
    <div
      aria-hidden={look === 'loading' ? true : undefined}
      className={frameClass}
      data-slot={look === 'failed' ? 'credits-unavailable' : undefined}
    >
      <span className="h-5 text-meta text-white/80">
        {look === 'failed' ? didNotLoad('The credits') : null}
      </span>
      <div className="flex pr-4 pb-[46px] max-lg:pb-0 max-lg:pl-3">
        {ghost(6, 'size-[88px]', look)}
      </div>
      <span className="h-5 max-lg:hidden" />
      <div className="flex pr-4 pb-10 max-lg:hidden">
        {ghost(7, 'size-[60px]', look)}
      </div>
    </div>
  );
}

/**
 * The episode's people (one read, shared by both parts): guest stars at
 * 88px and the show's regulars at 60px ("Starring", desktop only), and the
 * rolling end credits.
 */
function EpisodeCast({ episode, part, seriesId }: Props) {
  const credits = useEpisodeCredits(seriesId, episode);
  const view = useMemo(
    () =>
      credits
        ? {
            blocks: toRollBlocks(credits),
            guests: guestFaces(credits),
            starring: starringFaces(credits),
          }
        : null,
    [credits],
  );

  if (part === 'roll') {
    return view ? (
      <CreditsRoll blocks={view.blocks} key={codeOf(episode)} />
    ) : null;
  }
  if (credits === undefined) {
    return <FacesSkeleton />;
  }
  if (!view) {
    return <FacesSkeleton look="failed" />;
  }
  return (
    <>
      <EpisodeFaces label="Guest starring" people={view.guests} size="large" />
      <EpisodeFaces
        className="max-lg:hidden"
        label="Starring"
        people={view.starring}
        size="small"
      />
    </>
  );
}

const MemoEpisodeCast = memo(EpisodeCast);
MemoEpisodeCast.displayName = 'EpisodeCast';
export default MemoEpisodeCast;
