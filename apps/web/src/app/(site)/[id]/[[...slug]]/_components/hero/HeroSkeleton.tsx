import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { ActionButtonsSkeleton } from '../actions/ActionButtons';
import {
  PROMPT_CELL,
  PROMPT_FRAME,
  PromptGhost,
} from '../first-tracking/PromptCard';
import { ProgressSkeleton } from '../progress/ProgressBar';
import {
  PHONE_RATING_PROVIDER_GHOST,
  RatingAndProviderGhosts,
} from '../where-to-watch/RatingAndProvider';
import HeroGrid from './HeroGrid';
import {
  HERO_ACTIONS_ROW,
  HERO_DESCRIPTION,
  HERO_META_ROW,
  HERO_PROMPT_SLOT,
  HERO_RATING_CELL,
  HERO_SPACER,
  HERO_TITLE_GROUP,
  HERO_TITLE_SPACE,
} from './heroLayout';
import { ImdbRatingSkeleton } from './ImdbRating';

/** A bar inside a pulsing block (the meta row, the description) */
const BAR = cn('rounded-4', GHOST_FILL);
const YEAR_BAR = `h-3.5 w-14 ${BAR}`;
const SEASONS_BAR = `ml-4 h-3.5 w-20 ${BAR}`;
/** Narrower on phones, where the row ends with the age rating and logo */
const GENRES_BAR = `ml-4 h-3.5 w-16 md:w-40 ${BAR}`;

const TITLE_GHOST = cn(
  HERO_TITLE_SPACE,
  'block h-20 w-[300px] rounded-8 md:h-24 md:w-[420px]',
  GHOST_FILL,
  PULSE,
);

const META_GHOST = cn(HERO_META_ROW, PULSE);
/** Laid out as `ClampedText`: the lines, then the toggle 8px under them */
const DESCRIPTION_GHOST = cn(HERO_DESCRIPTION, 'flex flex-col gap-2', PULSE);

/**
 * The description's three lines (its clamp): 22px lines on phones, 28px on
 * desktop, the last one shorter.
 */
const DESCRIPTION_LINES = ['w-full', 'w-full', 'w-3/5'].map((bar, index) => ({
  bar: `h-3 ${BAR} ${bar}`,
  key: index,
}));
const DESCRIPTION_LINE = 'flex h-[22px] items-center md:h-7';

/**
 * The typical synopsis overflows three lines on phones only, so the More
 * toggle's 24px row is there on phones
 */
const TOGGLE_GHOST = 'flex h-6 items-center md:hidden';
const TOGGLE_BAR = `h-3 w-12 ${BAR}`;

/**
 * The hero for a show that is not known yet (the page's loading shell): the
 * hero's own grid and cells, with quiet bars where the title, facts,
 * description and actions go. The description is the typical show's: its
 * three-line clamp, with the More toggle on phones; the actions are the four
 * circles and the rating.
 */
export default function HeroSkeleton() {
  return (
    <HeroGrid seriesId={0}>
      <div aria-hidden="true" className={HERO_SPACER} />
      <div className={HERO_TITLE_GROUP}>
        <span className={TITLE_GHOST} />
        <div className={META_GHOST}>
          <span className={YEAR_BAR} />
          <span className={SEASONS_BAR} />
          <span className={GENRES_BAR} />
          <RatingAndProviderGhosts className={PHONE_RATING_PROVIDER_GHOST} />
        </div>
        <ProgressSkeleton />
      </div>
      <div className={HERO_PROMPT_SLOT} data-placeholder="first-tracking">
        {/* The prompt's box (most shows ask it) as flat ghosts */}
        <div className={PROMPT_FRAME}>
          <div className={PROMPT_CELL}>
            <PromptGhost />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className={DESCRIPTION_GHOST}>
        <div>
          {DESCRIPTION_LINES.map(({ bar, key }) => (
            <span className={DESCRIPTION_LINE} key={key}>
              <span className={bar} />
            </span>
          ))}
        </div>
        <span className={TOGGLE_GHOST}>
          <span className={TOGGLE_BAR} />
        </span>
      </div>
      <div className={HERO_ACTIONS_ROW}>
        <div className={HERO_RATING_CELL}>
          <ImdbRatingSkeleton />
        </div>
        <ActionButtonsSkeleton />
      </div>
    </HeroGrid>
  );
}
