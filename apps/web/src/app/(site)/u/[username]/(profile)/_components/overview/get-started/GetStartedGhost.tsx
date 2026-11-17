import { FLAT, Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { importGlyph, linkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import SectionHeadGhost from '@/components/ui/section/SectionHeadGhost';
import cn from '@/lib/cn';

import {
  GET_STARTED_INTRO,
  GET_STARTED_SECTION,
  GET_STARTED_STEPS,
  HISTORY_PILL,
  INTRO,
  PILL_ROW,
  PROGRESS,
  PROGRESS_BAR,
  SEEN_GRID,
  SEEN_POSTER,
  STEP_CIRCLE,
  STEP_LINE,
  STEP_ROW,
  STEP_TEXT,
  STEP_TITLE,
  STEPS,
} from './layout';

/** The region's six services as chips of typical widths (a logo and a name: Netflix, BBC iPlayer, Apple TV, Prime Video, Disney+, ITVX) */
const CHIP_WIDTHS = ['w-22', 'w-29', 'w-26', 'w-30', 'w-24', 'w-20'];
/** Already seen's eight posters */
const POSTERS = [0, 1, 2, 3, 4, 5, 6, 7];

const PROGRESS_BAR_GHOST = cn(PROGRESS_BAR, 'h-1 rounded-2');

/** "0 of 3 done" and its three-part bar */
const progress = (
  <span className={PROGRESS}>
    <TextLine className="text-caption" width="w-16" />
    <Ghost className={PROGRESS_BAR_GHOST} />
  </span>
);

const chips = (
  <span className={PILL_ROW}>
    {CHIP_WIDTHS.map((width, index) => {
      const chipClass = cn('h-8 rounded-full', width);
      return <Ghost className={chipClass} key={index} />;
    })}
  </span>
);

const posters = (
  <span className={SEEN_GRID}>
    {POSTERS.map((poster) => (
      <Ghost className={SEEN_POSTER} key={poster} />
    ))}
  </span>
);

const LINK_PILL = cn(HISTORY_PILL, FLAT);

/** The two links as flat pills their static labels size */
const links = (
  <span className={PILL_ROW}>
    <span className={LINK_PILL}>
      <Icon glyph={importGlyph} size={15} />
      Import a file
    </span>
    <span className={LINK_PILL}>
      <Icon glyph={linkGlyph} size={15} />
      Connect Plex
    </span>
  </span>
);

const CONTROLS = [chips, posters, links] as const;

const SECTION_GHOST = cn(GET_STARTED_SECTION, 'animate-ghost');

/**
 * Get started while it can't be drawn (its failed card lies over this, so a
 * failure keeps the block's size): the heading with its dot, the intro and
 * the three steps as flat ghosts in the card's own layout, the static copy
 * as text. A new user's common state: no step done, six services, eight
 * posters.
 */
export default function GetStartedGhost() {
  return (
    <div
      aria-hidden="true"
      className={SECTION_GHOST}
      data-placeholder="get-started"
    >
      <SectionHeadGhost link={progress} title="Get started" />
      <p className={GET_STARTED_INTRO}>{INTRO}</p>
      <div className={GET_STARTED_STEPS}>
        <div className="flex flex-col gap-2">
          {STEPS.map((step, index) => (
            <div
              className={STEP_ROW}
              data-placeholder={`get-started-step-${index + 1}`}
              key={step.title}
            >
              <Ghost className={STEP_CIRCLE} />
              <div className={STEP_TEXT}>
                <span className={STEP_TITLE}>{step.title}</span>
                <span className={STEP_LINE}>{step.line}</span>
                {CONTROLS[index]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
