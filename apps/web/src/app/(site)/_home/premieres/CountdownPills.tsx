import type { MouseEvent } from 'react';

import { PillSwitch, PillSwitchItem } from '@/components/ui/button/PillSwitch';

import { COUNTDOWN_PILL, COUNTDOWN_SWITCH } from './countdownLayout';

/** What a pill draws (only these fields reach the client) */
export type CountdownPill = Readonly<{
  /** "In 3 days": said with the title */
  label: string;
  title: string;
}>;

/**
 * The Countdown's switch: the shared pill switch (From your circle's), one
 * choice per premiere, its title; the chosen one filled.
 */
export default function CountdownPills({
  onChoose,
  onWarm,
  pills,
  pressed,
}: Readonly<{
  onChoose: (index: number) => void;
  /** first hover, focus or touch: mount the other backdrops */
  onWarm: () => void;
  pills: ReadonlyArray<CountdownPill>;
  pressed: number;
}>) {
  const choose = (event: MouseEvent<HTMLButtonElement>) =>
    onChoose(Number(event.currentTarget.dataset.index));
  return (
    <PillSwitch
      className={COUNTDOWN_SWITCH}
      label="Next premieres"
      onFocus={onWarm}
      onPointerEnter={onWarm}
    >
      {pills.map((pill, index) => {
        const label = `${pill.title}, ${pill.label}`;
        const isPressed = index === pressed;
        return (
          <PillSwitchItem
            aria-label={label}
            className={COUNTDOWN_PILL}
            data-index={index}
            key={pill.title}
            onClick={choose}
            pressed={isPressed}
            title={pill.title}
          >
            {pill.title}
          </PillSwitchItem>
        );
      })}
    </PillSwitch>
  );
}
