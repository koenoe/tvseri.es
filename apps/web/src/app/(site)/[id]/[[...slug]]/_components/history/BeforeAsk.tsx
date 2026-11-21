'use client';

import { episodeCode } from '@tvseri.es/schemas';
import { useCallback, useRef } from 'react';

import {
  chipStyles,
  textLinkStyles,
} from '@/components/ui/button/buttonStyles';
import { beforeWhat } from '@/lib/marking/copy';
import { useSeriesView } from '@/lib/marking/hooks';
import { openBefore } from '@/lib/marking/progress';
import type { EpisodeRef } from '@/lib/marking/types';
import useMarking from '@/lib/marking/useMarking';

import { useShow } from '../../_lib/ShowProvider';
import { useSheetUiStore } from './sheetUi';

const CHIP = chipStyles({ className: 'text-caption', variant: 'tonal' });
const PRIMARY = chipStyles({
  className: 'bg-white text-caption text-black/90 hover:bg-white/88',
  variant: 'tonal',
});
const LINK = textLinkStyles({ className: 'ml-1.5 text-caption' });

/**
 * Every answer takes the ask away with the button pressed, so focus held in
 * it moves back to the chip it asked about (in the same season) rather than
 * falling to the page. Run before the ask goes, while focus is still in it.
 */
const focusAskedChip = (ask: HTMLElement | null, chipIndex: number) => {
  if (!ask || chipIndex < 0 || !ask.contains(document.activeElement)) {
    return;
  }
  ask
    .closest('section')
    ?.querySelector<HTMLElement>(`[data-chip="${chipIndex}"]`)
    ?.focus({ preventScroll: true });
};

/**
 * "Mark the 3 before S03E08 too?" inline under the season: Yes, just now · Yes, release dates · No · Never for this show.
 * The count is live: it hides once nothing before is open.
 */
export default function BeforeAsk({
  chipIndex,
  target,
}: Readonly<{
  /** The asked-about chip's place in the season's grid (`data-chip`) */
  chipIndex: number;
  target: EpisodeRef;
}>) {
  const show = useShow();
  const view = useSeriesView(show.id);
  const marking = useMarking();
  const store = useSheetUiStore();
  const before = view ? openBefore(view, target) : [];

  const ask = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => {
    focusAskedChip(ask.current, chipIndex);
    store.setState({ ask: null });
  }, [chipIndex, store]);
  const yes = useCallback(() => {
    dismiss();
    marking.markEpisodes(
      show.id,
      before,
      { kind: 'now' },
      beforeWhat(before.length),
    );
  }, [before, dismiss, marking, show.id]);
  const release = useCallback(() => {
    dismiss();
    marking.markEpisodes(
      show.id,
      before,
      { kind: 'release' },
      beforeWhat(before.length),
    );
  }, [before, dismiss, marking, show.id]);
  const never = useCallback(() => {
    dismiss();
    marking.setNeverAskBefore(show.id, show.title);
  }, [dismiss, marking, show.id, show.title]);

  if (before.length === 0 || view?.prefs?.neverAskBefore) {
    return null;
  }
  return (
    <div
      aria-label="Mark the ones before too?"
      className="flex flex-col gap-2.5 rounded-12 bg-black/22 px-3 py-2.5"
      ref={ask}
      role="group"
    >
      <b className="text-body-sm font-semibold">
        {`Mark the ${before.length} before ${episodeCode(target)} too?`}
      </b>
      <div className="flex flex-wrap items-center gap-2">
        <button className={PRIMARY} onClick={yes} type="button">
          Yes, just now
        </button>
        <button className={CHIP} onClick={release} type="button">
          Yes, release dates
        </button>
        <button className={CHIP} onClick={dismiss} type="button">
          No
        </button>
        <button className={LINK} onClick={never} type="button">
          Never for this series
        </button>
      </div>
    </div>
  );
}
