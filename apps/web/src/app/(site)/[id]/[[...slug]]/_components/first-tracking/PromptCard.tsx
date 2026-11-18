import { PANEL_GLASS } from '@/components/ui/glass/glass';
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
/**
 * Phones: beside the question, its 32px box reaching 4px past the 24px line
 * so the row stays the line's height, and 10px into the card's 16px inset so
 * its words line up with the inset.
 */
const NOT_NOW_BOX =
  'h-8 rounded-8 max-md:col-start-2 max-md:row-start-1 max-md:-my-1 max-md:-mr-2.5 md:ml-auto';

/** Phones: equal thirds, the words centred at 13px */
const answerStyles = `relative inline-flex ${ANSWER_BOX} cursor-pointer items-center whitespace-nowrap bg-white/14 font-medium text-white transition-colors duration-200 hover:bg-white/24 focus-visible:bg-white/24 ${HIT_AREA} max-md:after:-inset-y-[5px] max-md:w-full max-md:justify-center max-md:px-1 max-md:text-meta/none md:px-3.5 md:text-body-sm`;

const notNowStyles = `relative ${NOT_NOW_BOX} cursor-pointer whitespace-nowrap px-2.5 text-body-sm font-medium text-white/60 hover:bg-white/8 hover:text-white ${HIT_AREA} max-md:after:-inset-y-1.5`;

/** The question's line box (24px). */
const TITLE =
  'flex min-w-0 max-w-full whitespace-nowrap text-body-sm font-medium md:shrink';
const QUESTION = `${TITLE} text-white max-md:font-semibold`;

/** The three answers: one row, of equal thirds on phones. */
const ANSWERS =
  'grid grid-cols-3 gap-1.5 max-md:col-span-2 md:flex md:flex-1 md:gap-2';

/**
 * The card's box and layout, shared by the card and its placeholder, with
 * the 20px to what follows it inside the frame, so it leaves with the card.
 * Desktop: one row. Phones: the question and Not now, then the answers.
 */
const CARD_BOX =
  'relative z-[5] mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 rounded-16 border px-4 pt-3.5 pb-4 md:-ml-2.5 md:flex md:w-[730px] md:max-w-[calc(100%+20px)] md:flex-row md:gap-4 md:py-3 md:pr-3 md:pl-5';

/** The card's glass: only the real card has it. */
const CARD = cn(
  CARD_BOX,
  'border-white/10 shadow-[0_14px_34px_-12px_rgb(0_0_0/0.55)]',
  PANEL_GLASS,
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
  const question = `Seen ${seriesTitle} before?`;
  return (
    <div
      aria-label="Where are you in this series?"
      className={CARD}
      role="group"
    >
      {/* a long title is cut, never the question's end or the answers: the
          card keeps its width and "Not now" stays inside it */}
      <b className={QUESTION} title={question}>
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

const GHOST_CARD_CLASS = cn(CARD_BOX, 'border-transparent', GHOST_LOOK.loading);
const GHOST_TITLE_CLASS = cn(TITLE, 'flex items-center');
const GHOST_QUESTION_CLASS = cn('h-3 w-[192px] rounded-4', GHOST_FILL);
const GHOST_ANSWER_JUST_STARTING_CLASS = cn(
  ANSWER_BOX,
  'md:w-[112px]',
  GHOST_FILL,
);
const GHOST_ANSWER_UP_TO_CLASS = cn(ANSWER_BOX, 'md:w-[98px]', GHOST_FILL);
const GHOST_ANSWER_FINISHED_CLASS = cn(ANSWER_BOX, 'md:w-[115px]', GHOST_FILL);
const GHOST_NOT_NOW_CLASS = cn(NOT_NOW_BOX, 'w-[76px]', GHOST_FILL);

/**
 * The card while the page loads: flat ghost shapes in the card's own box,
 * one pulsing layer, so it doesn't pass for the real card.
 * The question is a bar in its line box, the answers and Not now are ghost
 * pills as wide as their words on desktop (the typical show's "Seen Harbour
 * Lights before?") and the same thirds on phones; no words, no controls, no
 * glass.
 */
export function PromptGhost() {
  return (
    <div
      aria-hidden="true"
      className={GHOST_CARD_CLASS}
      data-placeholder="prompt-card"
    >
      <span className={GHOST_TITLE_CLASS}>
        {'\u200b'}
        <span className={GHOST_QUESTION_CLASS} />
      </span>
      <span className={ANSWERS}>
        <span className={GHOST_ANSWER_JUST_STARTING_CLASS} />
        <span className={GHOST_ANSWER_UP_TO_CLASS} />
        <span className={GHOST_ANSWER_FINISHED_CLASS} />
      </span>
      <span className={GHOST_NOT_NOW_CLASS} />
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
