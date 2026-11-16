import { checkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { STEPS } from '../_lib/copy';

type State = 'done' | 'on' | 'todo';

const stateOf = (index: number, current: number): State =>
  index + 1 === current ? 'on' : index + 1 < current ? 'done' : 'todo';

const STEP: Readonly<Record<State, string>> = {
  done: 'font-medium text-white/80',
  on: 'font-semibold text-white',
  todo: 'font-medium text-white/60',
};

const DOT: Readonly<Record<State, string>> = {
  done: 'bg-white/16 text-white',
  on: 'bg-white text-[#171717]',
  todo: 'shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.2)]',
};

const BAR: Readonly<Record<State, string>> = {
  done: 'bg-white/60',
  on: 'bg-white',
  todo: 'bg-white/14',
};

/**
 * "Upload · Check · Import" (560px); on phones
 * "Step 2 of 3 · Check" over three bars. Display
 * only: the steps are not links.
 */
export default function Stepper({ step }: Readonly<{ step: 1 | 2 | 3 }>) {
  const label = `Step ${step} of 3 · ${STEPS[step - 1]}`;
  return (
    <>
      <ol
        aria-label="Import steps"
        className="flex max-w-140 items-center max-md:hidden"
      >
        {STEPS.map((name, index) => {
          const state = stateOf(index, step);
          const isLast = index === STEPS.length - 1;
          return (
            <li
              className={cn(
                'flex min-w-0 items-center',
                isLast ? 'flex-none' : 'flex-1',
              )}
              key={name}
            >
              <span
                aria-current={state === 'on' ? 'step' : undefined}
                className={cn(
                  'inline-flex h-9 items-center gap-3 whitespace-nowrap pr-2.5 pl-1 text-body-sm',
                  STEP[state],
                )}
              >
                <i
                  className={cn(
                    'flex size-6.5 items-center justify-center rounded-full text-caption font-medium not-italic',
                    DOT[state],
                  )}
                >
                  {state === 'done' ? (
                    <Icon glyph={checkGlyph} size={13} />
                  ) : (
                    index + 1
                  )}
                </i>
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
        <span className="text-body-sm font-semibold text-white/80">
          {label}
        </span>
        <span aria-hidden="true" className="grid grid-cols-3 gap-1">
          {STEPS.map((name, index) => (
            <i
              className={cn('h-1 rounded-2', BAR[stateOf(index, step)])}
              key={name}
            />
          ))}
        </span>
      </div>
    </>
  );
}
