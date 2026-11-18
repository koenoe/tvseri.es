'use client';

import { useCallback, useState } from 'react';

import { Dialog } from '@/components/ui/dialog/Dialog';
import useMarking from '@/lib/marking/useMarking';
import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';
import { closeDialogs, type PickerRequest } from '../../_lib/dialogs';
import { useShow } from '../../_lib/ShowProvider';
import useShowQuery from '../../_lib/useShowQuery';
import PickerCalendar from './PickerCalendar';
import PickerOptions from './PickerOptions';
import { type PickerAnswer, pickerModel } from './pickerModel';
import { OVER_SHEET } from './placement';
import useViewWhileOpen from './useViewWhileOpen';

const handleOpenChange = (open: boolean) => {
  if (!open) {
    closeDialogs();
  }
};

type Shown = Readonly<{ request: PickerRequest; now: number }>;

/**
 * The date picker: "When did you watch E05?" with When, Without a
 * day and the month grid; a choice applies at once through
 * `useMarking().setWhen` (Undo lives in the toast), so there is no footer.
 * Keeps the last request while it animates out.
 */
export default function DatePicker({
  request,
}: Readonly<{ request: PickerRequest | null }>) {
  const show = useShow();
  const overSheet = useShowQuery(show.id).has('history');
  const marking = useMarking();
  const [shown, setShown] = useState<Shown | null>(null);
  if (request && request !== shown?.request) {
    setShown({ now: Date.now(), request });
  }
  const current = shown?.request;
  const view = useViewWhileOpen(current?.seriesId ?? show.id, request !== null);
  const one = current?.kind === 'one' ? current.refs[0] : undefined;
  const season = useSeasonEpisodes(show.id, one ? one.seasonNumber : null);
  const episode = one
    ? season?.episodes.find((item) => item.episodeNumber === one.episodeNumber)
    : undefined;

  const pick = useCallback(
    (answer: PickerAnswer) => {
      closeDialogs();
      if (current) {
        marking.setWhen(current.seriesId, current.refs, answer, current.what);
      }
    },
    [current, marking],
  );
  const pickDay = useCallback(
    (day: Date) => pick({ day, kind: 'day' }),
    [pick],
  );

  if (!shown || !view) {
    return null;
  }
  const model = pickerModel({
    episode,
    now: shown.now,
    request: shown.request,
    showTitle: show.title,
    view,
  });
  const placement = overSheet ? OVER_SHEET : undefined;
  const calendarKey = `${shown.now}:${model.selected?.getTime() ?? ''}`;
  const open = request !== null;
  return (
    <Dialog
      className={placement}
      description={model.subtitle}
      onOpenChange={handleOpenChange}
      open={open}
      title={model.title}
    >
      <div className="grid grid-cols-[216px_minmax(0,1fr)] items-start gap-5 max-sm:grid-cols-1 max-sm:gap-4.5">
        <PickerOptions alt={model.alt} onPick={pick} quick={model.quick} />
        <PickerCalendar
          key={calendarKey}
          now={shown.now}
          onPick={pickDay}
          selected={model.selected}
        />
      </div>
    </Dialog>
  );
}
