import type { MouseEvent, ReactNode } from 'react';

import { FILL_BEFORE } from '@/components/motion/fillBefore';
import ChoiceButton from '@/components/ui/button/ChoiceButton';

import { BINGE_CONTROLS, EACH_NIGHT_LABEL, NIGHTS_LABEL } from './layout';
import {
  NIGHTS_OPTIONS,
  type NightsMode,
  PER_NIGHT_OPTIONS,
  type PerNight,
  perNightLabel,
} from './plan';

/**
 * One option of a switch (the placeholder draws it as a face); under 390px
 * the options drop their 72px floor and most of their padding, so both
 * switches fit a 280px card. Pressed again and again, so its target reaches
 * 2px into each 4px gap and 4px to the group's edge: 44px tall, the
 * neighbours' targets meeting without overlap. The chosen fill is its
 * `::before`, so it glides to the next option chosen (`ChoiceButton`).
 */
export const BINGE_OPTION = `${FILL_BEFORE} h-9 cursor-pointer after:absolute after:-inset-x-0.5 after:-inset-y-1 rounded-8 px-1.5 text-center min-[390px]:min-w-18 min-[390px]:px-3.5 text-body-sm font-medium whitespace-nowrap text-white/60 tabular-nums transition-colors duration-150 hover:text-white aria-pressed:text-white aria-pressed:before:bg-white/16`;

/** One labelled switch: label, the segmented group, a hint */
export function ControlRow({
  children,
  hint,
  label,
}: Readonly<{ children: ReactNode; hint?: ReactNode; label: string }>) {
  return (
    <div className="flex flex-col items-start gap-2 md:h-11 md:flex-row md:items-center md:gap-4">
      <span className="text-meta text-white/60 md:w-22 md:shrink-0">
        {label}
      </span>
      <div
        aria-label={label}
        className="grid w-full auto-cols-fr grid-flow-col gap-1 rounded-12 bg-white/6 p-1 md:inline-grid md:w-auto"
        role="group"
      >
        {children}
      </div>
      {hint ? (
        <span className="text-meta whitespace-nowrap text-white/60 tabular-nums">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Each night (1 to 4 episodes) and Nights (every night, weeknights, weekends) */
export default function BingeControls({
  mode,
  nightLength,
  onMode,
  onPerNight,
  perNight,
}: Readonly<{
  mode: NightsMode;
  /** "1h 44m" */
  nightLength: string;
  onMode: (mode: NightsMode) => void;
  onPerNight: (count: PerNight) => void;
  perNight: PerNight;
}>) {
  const hint = `≈ ${nightLength} a night`;
  const choosePerNight = (event: MouseEvent<HTMLButtonElement>) =>
    onPerNight(Number(event.currentTarget.value) as PerNight);
  const chooseMode = (event: MouseEvent<HTMLButtonElement>) =>
    onMode(event.currentTarget.value as NightsMode);
  return (
    <div className={BINGE_CONTROLS}>
      <ControlRow hint={hint} label={EACH_NIGHT_LABEL}>
        {PER_NIGHT_OPTIONS.map((count) => {
          const chosen = count === perNight;
          return (
            <ChoiceButton
              aria-pressed={chosen}
              className={BINGE_OPTION}
              key={count}
              on={chosen}
              onClick={choosePerNight}
              value={count}
            >
              {perNightLabel(count)}
            </ChoiceButton>
          );
        })}
      </ControlRow>
      <ControlRow label={NIGHTS_LABEL}>
        {NIGHTS_OPTIONS.map((option) => {
          const chosen = option.mode === mode;
          return (
            <ChoiceButton
              aria-pressed={chosen}
              className={BINGE_OPTION}
              key={option.mode}
              on={chosen}
              onClick={chooseMode}
              value={option.mode}
            >
              {option.label}
            </ChoiceButton>
          );
        })}
      </ControlRow>
    </div>
  );
}
