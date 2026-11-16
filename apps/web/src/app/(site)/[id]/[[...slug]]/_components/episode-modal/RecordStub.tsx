'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { type MouseEvent, memo, useCallback, useMemo } from 'react';

import CircleButton from '@/components/ui/button/CircleButton';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import { clearToastOver } from '@/components/ui/toast/clearToast';
import { episodeLabel } from '@/lib/marking/copy';
import { useEpisodeRecord, useNextEpisode } from '@/lib/marking/hooks';
import { episodeKey, pressMark } from '@/lib/marking/pressGate';
import { codeOf } from '@/lib/marking/progress';
import { useEpisodeToggle } from '@/lib/marking/toggles';

import { openPicker } from '../../_lib/dialogs';
import { openHistory } from '../../_lib/urlState';
import { preloadHistorySheet } from '../history/HistorySheetIsland';
import { preloadPicker } from '../picker/PickerHost';
import { toRecordStub } from './recordStubText';
import StepButton from './StepButton';

type Props = Readonly<{
  seriesId: number;
  episode: EpisodeRef;
  title: string;
  airDate: string;
  hasPrev: boolean;
  hasNext: boolean;
  onStep: (direction: -1 | 1) => void;
}>;

const LINK =
  'cursor-pointer text-caption font-medium text-white/80 underline underline-offset-2 hover:text-white max-sm:font-normal max-sm:text-white/60 max-sm:no-underline';

/**
 * The record stub: the eye
 * toggles this episode (Just now; the "before it too?" question rides in the
 * toast, as on the page), Change date opens the picker, See full history the
 * sheet at this season; ‹ › step through the show. Hovering or focusing
 * either link fetches its overlay's code, so the first opening doesn't wait.
 */
function RecordStub({
  airDate,
  episode,
  hasNext,
  hasPrev,
  onStep,
  seriesId,
  title,
}: Props) {
  const what = episodeLabel(episode, title);
  const eye = useEpisodeToggle(seriesId, episode, { title });
  const record = useEpisodeRecord(seriesId, episode);
  const next = useNextEpisode(seriesId);
  const isNextUp = next ? codeOf(next) === codeOf(episode) : false;
  const stub = useMemo(
    () =>
      toRecordStub({
        airDate,
        isNextUp,
        now: Date.now(),
        record,
        state: eye.state,
      }),
    [airDate, eye.state, isNextUp, record],
  );

  const { toggle } = eye;
  const toggleEye = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      pressMark(episodeKey(seriesId, codeOf(episode)), event, toggle);
    },
    [episode, seriesId, toggle],
  );
  const changeDate = useCallback(() => {
    openPicker({ kind: 'one', refs: [episode], seriesId, what });
  }, [episode, seriesId, what]);
  const seeHistory = useCallback(() => {
    openHistory(episode.seasonNumber);
  }, [episode.seasonNumber]);

  const eyeLabel = `${what} · ${
    stub.pressed ? 'Watched · tap to unmark' : 'Mark watched (just now)'
  }`;

  return (
    // Docked at the bottom on phones: the mark toast rises above it
    <div
      className="mt-1 flex items-center gap-3 rounded-14 bg-white/8 py-2.5 pr-3 pl-2.5 max-sm:fixed max-sm:inset-x-3.5 max-sm:bottom-[29px] max-sm:z-10 max-sm:gap-2.5 max-sm:px-3.5 max-sm:py-3 max-sm:bg-[color-mix(in_srgb,color-mix(in_srgb,var(--color-page)_70%,black)_92%,white)]"
      data-record-stub=""
      ref={clearToastOver}
    >
      <CircleButton
        className="bg-white/5 text-white/60"
        icon={eyeGlyph}
        label={eyeLabel}
        onClick={toggleEye}
        pressed={stub.pressed}
        size={40}
      />
      <span className="flex min-w-0 flex-col gap-0.5 text-body-sm sm:text-[13px] sm:leading-5">
        <b className="truncate font-semibold text-white sm:font-bold">
          <span className="max-sm:hidden">{stub.desktop.line}</span>
          <span className="sm:hidden">{stub.phone.line}</span>
        </b>
        <span className="text-caption text-white/60">
          {stub.desktop.sub ? (
            <span className="max-sm:hidden">{stub.desktop.sub} · </span>
          ) : null}
          <button
            className={LINK}
            onClick={changeDate}
            onFocus={preloadPicker}
            onPointerEnter={preloadPicker}
            type="button"
          >
            {stub.dateAction}
          </button>
          {' · '}
          <button
            className={LINK}
            onClick={seeHistory}
            onFocus={preloadHistorySheet}
            onPointerEnter={preloadHistorySheet}
            type="button"
          >
            See full history
          </button>
        </span>
      </span>
      <span className="ml-4 flex shrink-0 gap-1.5 max-sm:ml-auto">
        <StepButton direction={-1} enabled={hasPrev} onStep={onStep} />
        <StepButton direction={1} enabled={hasNext} onStep={onStep} />
      </span>
    </div>
  );
}

const MemoRecordStub = memo(RecordStub);
MemoRecordStub.displayName = 'RecordStub';
export default MemoRecordStub;
