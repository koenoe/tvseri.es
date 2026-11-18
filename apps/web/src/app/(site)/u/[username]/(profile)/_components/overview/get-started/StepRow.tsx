import type { ReactNode } from 'react';

import StepCircle, {
  type StepCircleLayout,
} from '@/components/ui/step/StepCircle';

import {
  STEP_CIRCLE,
  STEP_LINE,
  STEP_ROW,
  STEP_TEXT,
  STEP_TITLE,
} from './layout';

/** Each place keeps its own look on purpose; don't unify them. */
const CIRCLE: StepCircleLayout = {
  base: `${STEP_CIRCLE} flex items-center justify-center border-2 text-body-sm font-medium tabular-nums transition-colors`,
  check: 16,
  done: 'border-white bg-white text-[#171717]',
  todo: 'border-white/20 text-white',
};

/** One of the three steps: the numbered circle (a check once done), title, line, controls */
export default function StepRow({
  children,
  done,
  line,
  number,
  title,
}: Readonly<{
  children: ReactNode;
  done: boolean;
  line: string;
  number: number;
  title: string;
}>) {
  const slot = `get-started-step-${number}`;
  return (
    <div className={STEP_ROW} data-slot={slot}>
      <StepCircle
        aria-hidden="true"
        done={done}
        layout={CIRCLE}
        number={number}
      />
      <div className={STEP_TEXT}>
        <h3 className={STEP_TITLE}>
          {title}
          <span className="sr-only">{done ? ', done' : ''}</span>
        </h3>
        <p className={STEP_LINE}>{line}</p>
        {children}
      </div>
    </div>
  );
}
