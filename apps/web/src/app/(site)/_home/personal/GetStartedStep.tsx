import Link from 'next/link';

import StepCircle, {
  type StepCircleLayout,
} from '@/components/ui/step/StepCircle';

export type Step = Readonly<{
  body: string;
  done: boolean;
  href: string;
  number: number;
  title: string;
}>;

/** A step card, shared with the placeholder */
export const STEP_CARD = 'flex flex-col gap-3 rounded-16 bg-black/22 p-6';

/** The numbered circle's box (the placeholder's ghost) */
export const STEP_CIRCLE = 'size-8 rounded-full';

/** Each place keeps its own look on purpose; don't unify them. */
const CIRCLE: StepCircleLayout = {
  base: 'flex size-8 items-center justify-center rounded-full',
  check: 13,
  done: 'bg-white text-black/90',
  todo: 'text-caption font-medium text-white/60 tabular-nums shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)]',
};

/** The card's title and its line of why: static copy, the same in the placeholder */
export function StepText({
  body,
  title,
}: Readonly<Pick<Step, 'body' | 'title'>>) {
  return (
    <>
      <b className="text-body font-semibold text-white">{title}</b>
      <span className="text-body-sm text-white/60">{body}</span>
    </>
  );
}

/**
 * One Get started card: the numbered circle (a check when done), the title
 * and one line of why. The whole card links to where the step is done.
 */
export default function GetStartedStep({ step }: Readonly<{ step: Step }>) {
  const label = step.done ? `${step.title}, done` : undefined;
  return (
    <Link aria-label={label} className={STEP_CARD} href={step.href}>
      <StepCircle done={step.done} layout={CIRCLE} number={step.number} />
      <StepText body={step.body} title={step.title} />
    </Link>
  );
}
