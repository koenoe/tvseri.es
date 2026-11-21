import StepCircle, {
  type StepCircleLayout,
} from '@/components/ui/step/StepCircle';
import cn from '@/lib/cn';

import { STEPS } from '../_lib/copy';

/** The current step, one per width (`useStepFocus` hands it the focus) */
export const STEP_NOW = 'data-step-now';

type State = 'done' | 'on' | 'todo';

const stateOf = (index: number, current: number): State =>
  index + 1 === current ? 'on' : index + 1 < current ? 'done' : 'todo';

const STEP: Readonly<Record<State, string>> = {
  done: 'font-medium text-white/80',
  on: 'font-semibold text-white',
  todo: 'font-medium text-white/60',
};

const DOT_BASE =
  'flex size-6.5 items-center justify-center rounded-full text-caption font-medium';

/** The step's circle: the current step and the ones ahead are both open */
const dot = (open: string): StepCircleLayout => ({
  base: DOT_BASE,
  check: 13,
  done: 'bg-white/16 text-white',
  todo: open,
});

const DOT: Readonly<Record<State, StepCircleLayout>> = {
  done: dot(''),
  on: dot('bg-white text-[#171717]'),
  todo: dot('shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.2)]'),
};

const BAR: Readonly<Record<State, string>> = {
  done: 'bg-white/60',
  on: 'bg-white',
  todo: 'bg-white/14',
};

/**
 * "Upload · Check · Import" (560px); on phones
 * "Step 2 of 3 · Check" over three bars. Display
 * only: the steps are not links. The current step takes focus when a press
 * moves the importer on (`useStepFocus`).
 */
export default function Stepper({ step }: Readonly<{ step: 1 | 2 | 3 }>) {
  const label = `Step ${step} of 3 · ${STEPS[step - 1]}`;
  const stepNow = { [STEP_NOW]: '', tabIndex: -1 };
  return (
    <>
      <ol
        aria-label="Import steps"
        className="flex max-w-140 items-center max-md:hidden"
      >
        {STEPS.map((name, index) => {
          const state = stateOf(index, step);
          const isLast = index === STEPS.length - 1;
          const itemClass = cn(
            'flex min-w-0 items-center',
            isLast ? 'flex-none' : 'flex-1',
          );
          const stepClass = cn(
            // round, so the focus ring is concentric with the step's circle
            'inline-flex h-9 items-center gap-3 whitespace-nowrap rounded-full pr-2.5 pl-1 text-body-sm',
            STEP[state],
          );
          const isNow = state === 'on';
          const current = isNow ? 'step' : undefined;
          // Only the current step holds focus (a step change hands it here)
          const now = isNow ? stepNow : null;
          const done = state === 'done';
          const number = index + 1;
          return (
            <li className={itemClass} key={name}>
              <span aria-current={current} className={stepClass} {...now}>
                <StepCircle done={done} layout={DOT[state]} number={number} />
                {name}
              </span>
              {isLast ? null : (
                <span className="mx-2 h-px min-w-3 flex-1 bg-white/12" />
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2.5 md:hidden">
        <span className="text-body-sm font-semibold text-white/80" {...stepNow}>
          {label}
        </span>
        <span aria-hidden="true" className="grid grid-cols-3 gap-1">
          {STEPS.map((name, index) => {
            const barClass = cn('h-1 rounded-2', BAR[stateOf(index, step)]);
            return <i className={barClass} key={name} />;
          })}
        </span>
      </div>
    </>
  );
}
