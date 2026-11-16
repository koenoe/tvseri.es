import { GHOST_FILL, GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

/**
 * Phones: a 44px touch target around the smaller pill (34px answers,
 * 32px Not now), on an invisible layer, so the pill's look stays.
 */
const HIT_AREA =
  "max-md:after:absolute max-md:after:inset-x-0 max-md:after:content-['']";

/** An answer pill's box (34px tall, fully round) and Not now's (32px). */
const ANSWER_BOX = 'h-[34px] shrink-0 rounded-full';
const NOT_NOW_BOX = 'h-8 rounded-8 md:ml-auto max-md:self-end';

const answerStyles = `relative inline-flex ${ANSWER_BOX} cursor-pointer items-center whitespace-nowrap bg-white/14 px-3.5 text-body-sm font-medium text-white transition-colors duration-200 hover:bg-white/24 focus-visible:bg-white/24 ${HIT_AREA} max-md:after:-inset-y-[5px]`;

const notNowStyles = `relative ${NOT_NOW_BOX} cursor-pointer whitespace-nowrap px-2.5 text-body-sm font-medium text-white/60 hover:bg-white/8 hover:text-white ${HIT_AREA} max-md:after:-inset-y-1.5`;

/** The question's line box (24px). */
const TITLE =
  'flex min-w-0 max-w-full whitespace-nowrap text-body-sm font-medium md:shrink';

/** The three answers: one row on desktop, wrapping on phones. */
const ANSWERS = 'flex flex-wrap gap-2 md:flex-1 md:flex-nowrap';

/** The card's box and layout, shared by the card and its placeholder. */
const CARD_BOX =
  'relative z-[5] flex flex-col items-start gap-2.5 rounded-16 border py-3 pr-3 pl-5 max-md:mt-4 max-md:-mb-6 md:mb-5 md:-ml-2.5 md:w-[730px] md:max-w-[calc(100%+20px)] md:flex-row md:items-center md:gap-4';

/** The card's glass: only the real card has it. */
const CARD = cn(
  CARD_BOX,
  'border-white/10 bg-white/9 shadow-[0_14px_34px_-12px_rgb(0_0_0/0.55)] backdrop-blur-[14px]',
);

export type PromptAnswers = Readonly<{
  onStarting: () => void;
  onUpTo: () => void;
  /** Hover, focus or first touch of "I'm up to…": fetch its dialog's code */
  onUpToIntent?: () => void;
  onFinished: () => void;
  onNotNow: () => void;
}>;

/**
 * The first-tracking card: "Seen The Bear before?" · Just starting · I'm up to… · Finished
 * it all · Not now.
 */
export default function PromptCard({
  answers,
  seriesTitle,
}: Readonly<{ seriesTitle: string; answers: PromptAnswers }>) {
  return (
    <div
      aria-label="Where are you in this series?"
      className={CARD}
      role="group"
    >
      {/* a long title is cut, never the question's end or the answers: the
          card keeps its width and "Not now" stays inside it */}
      <b
        className={`${TITLE} text-white max-md:font-semibold`}
        title={`Seen ${seriesTitle} before?`}
      >
        <span className="shrink-0">Seen&nbsp;</span>
        <span className="min-w-0 truncate">{seriesTitle}</span>
        <span className="shrink-0">&nbsp;before?</span>
      </b>
      <span className={ANSWERS}>
        <button
          className={answerStyles}
          onClick={answers.onStarting}
          type="button"
        >
          Just starting
        </button>
        <button
          aria-haspopup="dialog"
          className={answerStyles}
          onClick={answers.onUpTo}
          onFocus={answers.onUpToIntent}
          onPointerEnter={answers.onUpToIntent}
          type="button"
        >
          I’m up to…
        </button>
        <button
          className={answerStyles}
          onClick={answers.onFinished}
          type="button"
        >
          Finished it all
        </button>
      </span>
      <button className={notNowStyles} onClick={answers.onNotNow} type="button">
        Not now
      </button>
    </div>
  );
}

/**
 * The card while the page loads (the skeleton looked "too
 * much like the actual component"; "I wouldn't show the glass in a
 * skeleton"): flat ghost shapes in the card's own box, one pulsing layer.
 * The question is a bar in its line box, the answers and Not now are ghost
 * pills as wide as their words (the typical show's "Seen Harbour Lights
 * before?"), so they wrap on phones as the real ones do; no words, no
 * controls, no glass.
 */
export function PromptGhost() {
  return (
    <div
      aria-hidden="true"
      className={cn(CARD_BOX, 'border-transparent', GHOST_LOOK.loading)}
      data-placeholder="prompt-card"
    >
      <span className={cn(TITLE, 'flex items-center')}>
        {'\u200b'}
        <span className={cn('h-3 w-[192px] rounded-4', GHOST_FILL)} />
      </span>
      <span className={ANSWERS}>
        <span className={cn(ANSWER_BOX, 'w-[112px]', GHOST_FILL)} />
        <span className={cn(ANSWER_BOX, 'w-[98px]', GHOST_FILL)} />
        <span className={cn(ANSWER_BOX, 'w-[115px]', GHOST_FILL)} />
      </span>
      <span className={cn(NOT_NOW_BOX, 'w-[76px]', GHOST_FILL)} />
    </div>
  );
}

/**
 * The prompt's frame: hidden before the first paint when this browser knows
 * it isn't for this viewer (`data-show-prompt="no"`, `lib/viewer/htmlHints`),
 * unless the viewer's own marks say ask (`data-ask`). Leaving, it fades and
 * its row collapses (grid rows 1fr → 0fr), so what is below glides up.
 */
export const PROMPT_FRAME =
  'grid grid-cols-[minmax(0,1fr)] grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-[220ms] ease-[cubic-bezier(0.32,0.72,0,1)] [html[data-show-prompt=no]_&:not([data-ask])]:hidden data-[leaving]:pointer-events-none data-[leaving]:grid-rows-[0fr] data-[leaving]:opacity-0';

/** The frame's one cell: shrinks with the row; clips only while leaving. */
export const PROMPT_CELL =
  'min-h-0 min-w-0 group-data-[leaving]/prompt:overflow-y-clip';
