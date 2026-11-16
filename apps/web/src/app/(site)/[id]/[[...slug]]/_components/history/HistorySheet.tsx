'use client';

import { useCallback, useEffect, useState } from 'react';

import { textLinkStyles } from '@/components/ui/button/buttonStyles';
import SideSheet from '@/components/ui/dialog/SideSheet';
import whenIdle from '@/lib/lazy/whenIdle';
import { useSeriesAnswer } from '@/lib/marking/hooks';
import type { SeriesBase } from '@/lib/marking/types';
import useMarking from '@/lib/marking/useMarking';
import { useShow } from '../../_lib/ShowProvider';
import { preloadPicker } from '../picker/PickerHost';
import { preloadUpTo } from '../picker/UpToHost';
import ProgressSubheader from './ProgressSubheader';
import SeasonSection from './SeasonSection';
import SheetTop from './SheetTop';
import { createSheetUi, SheetUiContext } from './sheetUi';

const LINK = textLinkStyles({ className: 'text-caption' });
const SUBHEADER = <ProgressSubheader />;

const preloadDialogs = () => {
  preloadPicker();
  preloadUpTo();
};

const isNeverAsking = (view: SeriesBase | undefined) =>
  view?.prefs?.neverAskBefore === true;

/** "Not asking about earlier episodes of The Bear · Ask again" (`.h1-off`). */
function NeverAskNote() {
  const show = useShow();
  const neverAsking = useSeriesAnswer(show.id, isNeverAsking);
  const marking = useMarking();
  const askAgain = useCallback(
    () => marking.setNeverAskBefore(show.id, show.title, false),
    [marking, show.id, show.title],
  );
  if (!neverAsking) {
    return null;
  }
  return (
    <p className="flex items-center gap-2.5 rounded-18 bg-white/2 px-5 py-3.5 text-caption text-white/60">
      {`Not asking about earlier episodes of ${show.title} · `}
      <button className={LINK} onClick={askAgain} type="button">
        Ask again
      </button>
    </p>
  );
}

/** The body: a fresh UI store per opening (mode, legend, runs start over). */
function SheetBody({ season }: Readonly<{ season: number | null }>) {
  const show = useShow();
  const [store] = useState(createSheetUi);
  // The sheet's taps open the picker and "I'm up to…": fetch their code
  // while the sheet slides in, so they open at once.
  useEffect(() => whenIdle(preloadDialogs), []);
  return (
    <SheetUiContext value={store}>
      <div className="flex flex-col gap-6 pt-2 max-sm:gap-3 max-sm:pt-0">
        <SheetTop />
        {show.seasons.map((item) => (
          <SeasonSection
            initial={item.seasonNumber === season}
            key={item.seasonNumber}
            season={item}
          />
        ))}
        <NeverAskNote />
      </div>
    </SheetUiContext>
  );
}

/**
 * The watch-history sheet of chips: a 600px full-height side sheet on desktop, full screen on
 * phones. `season` scrolls that season into view when it opens.
 */
export default function HistorySheet({
  onClose,
  open,
  season,
}: Readonly<{ open: boolean; season: number | null; onClose: () => void }>) {
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
    }
  };
  return (
    <SideSheet
      onOpenChange={handleOpenChange}
      open={open}
      subheader={SUBHEADER}
      title="Watch history"
    >
      <SheetBody season={season} />
    </SideSheet>
  );
}
