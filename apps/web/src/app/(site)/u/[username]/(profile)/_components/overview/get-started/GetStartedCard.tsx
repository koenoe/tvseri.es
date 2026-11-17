'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { useState } from 'react';
import Dot from '@/components/ui/lane/Dot';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { isGetStartedDone } from '@/lib/profile/getStartedDone';
import { useSelectedServices } from '@/lib/watchProviders/useSelectedServices';
import { doneCount, progressText } from './getStartedCopy';
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
        {segments.map((step) => {
          const segmentClass = cn(
            'h-1 flex-1 rounded-2 transition-colors',
            step <= done ? 'bg-white' : 'bg-white/12',
          );
          return <i className={segmentClass} key={step} />;
        })}
      </span>
    </span>
  );
}

/**
 * Get started: three steps that make the page run itself.
 * Services save as Settings saves them (`useSelectedServices`: the chips
 * settle on what the server has, a failed save says so), Already seen marks the
 * whole show through the marking core, history is two links. With the
 * third step done here it is gone at once, as on Home (`isGetStartedDone`).
 */
export default function GetStartedCard(props: Props) {
  const { selected, toggle } = useSelectedServices(props.selected, {
    undo: false,
  });
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());

  const done = doneCount({
    alreadySeen: props.alreadySeen || seen.size > 0,
    history: props.history,
    services: selected.length > 0,
  });

  // One way: a seen show stays seen here (the core's toast has the Undo)
  const onSeen = (seriesId: number) =>
    setSeen((previous) => new Set(previous).add(seriesId));

  if (isGetStartedDone({ doneCount: done, hidden: false })) {
    return null;
  }

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
      <p className={GET_STARTED_INTRO}>{INTRO}</p>
      <div className={GET_STARTED_STEPS}>
        <div className="flex flex-col gap-2">
          <StepRow
            done={selected.length > 0}
            line={STEPS[0].line}
            number={1}
            title={STEPS[0].title}
          >
            <ServicePicker
              onToggle={toggle}
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
      </div>
    </section>
  );
}
