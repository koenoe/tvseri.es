'use client';

import Image from 'next/image';
import { useState } from 'react';

import { checkGlyph, eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { useSeriesProgress } from '@/lib/marking/hooks';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import useIntentSeed from '@/lib/marking/useIntentSeed';
import useMarking from '@/lib/marking/useMarking';
import { SEEN_GRID } from './layout';
import type { SeenShow } from './loadGetStarted';

/**
 * Already seen (`ue-gs-sn`): popular posters to mark as seen. One way only:
 * a tap marks the show seen through the core's `markSeen` (every aired
 * episode, "I don't remember", as "Finished it all": out of this year's
 * stats and history), and never unmarks anything. Shows in your lists are never
 * offered, a finished one (`isFinished`) can't be tapped, and one with any history is left
 * alone. The core's toast carries the Undo.
 */
export default function SeenGrid({
  onSeen,
  seen,
  shows,
}: Readonly<{
  onSeen: (seriesId: number) => void;
  seen: ReadonlySet<number>;
  shows: ReadonlyArray<SeenShow>;
}>) {
  return (
    <div className={SEEN_GRID}>
      {shows.map((show) => (
        <SeenTile
          key={show.id}
          onSeen={onSeen}
          seen={seen.has(show.id)}
          show={show}
        />
      ))}
    </div>
  );
}

export function SeenTile({
  onSeen,
  seen,
  show,
}: Readonly<{
  onSeen: (seriesId: number) => void;
  seen: boolean;
  show: SeenShow;
}>) {
  const marking = useMarking();
  const store = useMarkingStoreApi();
  const progress = useSeriesProgress(show.id);
  const { intent, run } = useIntentSeed(show.id);
  const [marked, setMarked] = useState(false);
  const isSeen = seen || marked || progress?.isFinished === true;

  const markSeen = () => {
    if (isSeen) {
      return;
    }
    setMarked(true);
    onSeen(show.id);
    run(() => {
      // Decided again once the show is loaded: any history at all and the
      // show is left alone (never re-marked, never unmarked)
      const view = store.getState().series[show.id]?.view;
      if (view && Object.keys(view.watched).length === 0) {
        marking.markSeen(show.id, show.title);
      }
    });
  };

  const imageClass = cn(
    'object-cover transition-[filter]',
    isSeen && 'brightness-[0.35] saturate-50',
  );
  return (
    <button
      aria-disabled={isSeen || undefined}
      aria-label={`${show.title}, ${isSeen ? 'seen' : 'mark as seen'}`}
      className="relative block cursor-pointer overflow-hidden rounded-8 text-left aria-disabled:cursor-default"
      onClick={markSeen}
      onFocus={intent}
      onPointerEnter={intent}
      onTouchStart={intent}
      title={show.title}
      type="button"
    >
      <span className="relative block aspect-2/3 bg-white/8">
        {show.posterImage ? (
          <Image
            alt=""
            className={imageClass}
            fill
            sizes="(min-width: 640px) 100px, 25vw"
            src={show.posterImage}
          />
        ) : null}
      </span>
      {isSeen ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-caption font-medium">
          <span className="flex size-7 items-center justify-center rounded-full bg-white text-[#171717]">
            <Icon glyph={checkGlyph} size={13} />
          </span>
          Seen
        </span>
      ) : (
        <span className="absolute right-1.5 bottom-1.5 flex size-7 items-center justify-center rounded-full border-2 border-white/20 bg-[rgb(15_20_20/0.5)] backdrop-blur-[6px]">
          <Icon glyph={eyeGlyph} size={13} />
        </span>
      )}
    </button>
  );
}
