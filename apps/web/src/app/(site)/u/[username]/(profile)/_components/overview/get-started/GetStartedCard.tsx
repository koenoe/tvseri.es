'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { useState, useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { completeGlyph } from '@/components/ui/icon/glyphs';
import SectionHead from '@/components/ui/section/SectionHead';
import { showToast } from '@/components/ui/toast/showToast';
import cn from '@/lib/cn';
import { saveServices } from '../../../_actions/services';
import Dot from '../../blocks/Dot';
import IconDisc from '../../blocks/IconDisc';
import { doneCount, progressText, toggleProvider } from './getStartedCopy';
import HistoryLinks from './HistoryLinks';
import {
  GET_STARTED_INTRO,
  GET_STARTED_SECTION,
  GET_STARTED_STEPS,
  INTRO,
  PROGRESS,
  PROGRESS_BAR,
  STEPS,
} from './layout';
import type { SeenShow } from './loadGetStarted';
import SeenGrid from './SeenGrid';
import ServicePicker from './ServicePicker';
import StepRow from './StepRow';

type Props = Readonly<{
  alreadySeen: boolean;
  history: boolean;
  providers: ReadonlyArray<WatchProvider>;
  selected: ReadonlyArray<WatchProvider>;
  shows: ReadonlyArray<SeenShow>;
}>;

const PROGRESS_TEXT = cn(
  PROGRESS,
  'whitespace-nowrap text-caption tabular-nums text-white/60',
);
const PROGRESS_SEGMENTS = cn(PROGRESS_BAR, 'flex gap-1');

function Progress({ done }: Readonly<{ done: number }>) {
  const segments = [1, 2, 3];
  return (
    <span className={PROGRESS_TEXT}>
      {progressText(done)}
      <span aria-hidden="true" className={PROGRESS_SEGMENTS}>
        {segments.map((step) => (
          <i
            className={cn(
              'h-1 flex-1 rounded-2 transition-colors',
              step <= done ? 'bg-white' : 'bg-white/12',
            )}
            key={step}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * Get started: three steps that make the page run itself.
 * Services save through the profile's server action, Already seen marks the
 * whole show through the marking core, history is two links. All three done
 * collapses to "All set" with Show steps.
 */
export default function GetStartedCard(props: Props) {
  const [selected, setSelected] = useState(props.selected);
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const done = doneCount({
    alreadySeen: props.alreadySeen || seen.size > 0,
    history: props.history,
    services: selected.length > 0,
  });
  const allSet = done >= 3;

  const onToggle = (provider: WatchProvider, on: boolean) => {
    const before = selected;
    const next = toggleProvider(before, provider, on);
    setSelected(next);
    startTransition(async () => {
      const result = await saveServices(next).catch(() => null);
      if (!result?.ok) {
        setSelected(before);
        showToast({
          title: "Couldn't save that. It's back as it was.",
          tone: 'error',
        });
      }
    });
  };
  // One way: a seen show stays seen here (the core's toast has the Undo)
  const onSeen = (seriesId: number) =>
    setSeen((previous) => new Set(previous).add(seriesId));
  const toggleOpen = () => setOpen((value) => !value);
  const showRows = !allSet || open;

  return (
    <section
      aria-labelledby="get-started-title"
      className={GET_STARTED_SECTION}
      data-slot="get-started"
      id="get-started"
    >
      <SectionHead
        id="get-started-title"
        leading={<Dot tone="white" />}
        link={<Progress done={done} />}
        title="Get started"
      />
      {allSet ? null : <p className={GET_STARTED_INTRO}>{INTRO}</p>}
      <div className={GET_STARTED_STEPS}>
        {allSet ? <AllSet onToggle={toggleOpen} open={open} /> : null}
        {showRows ? (
          <div className="flex flex-col gap-2">
            <StepRow
              done={selected.length > 0}
              line={STEPS[0].line}
              number={1}
              title={STEPS[0].title}
            >
              <ServicePicker
                onToggle={onToggle}
                providers={props.providers}
                selected={selected}
              />
            </StepRow>
            <StepRow
              done={props.alreadySeen || seen.size > 0}
              line={STEPS[1].line}
              number={2}
              title={STEPS[1].title}
            >
              <SeenGrid onSeen={onSeen} seen={seen} shows={props.shows} />
            </StepRow>
            <StepRow
              done={props.history}
              line={STEPS[2].line}
              number={3}
              title={STEPS[2].title}
            >
              <HistoryLinks />
            </StepRow>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Every step done: the card stays 3 days, its steps folded */
function AllSet({
  onToggle,
  open,
}: Readonly<{ onToggle: () => void; open: boolean }>) {
  return (
    <div className="flex items-center gap-3.5 px-1 py-1.5">
      <IconDisc glyph={completeGlyph} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-sm font-semibold">All set</span>
        <span className="text-caption text-white/60">
          This card leaves your profile in 3 days.
        </span>
      </span>
      <Button
        aria-expanded={open}
        className="h-8 px-3.5"
        onClick={onToggle}
        variant="outline"
      >
        {open ? 'Hide steps' : 'Show steps'}
      </Button>
    </div>
  );
}
