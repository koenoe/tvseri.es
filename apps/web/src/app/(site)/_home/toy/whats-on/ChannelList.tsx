'use client';

import type { KeyboardEvent, ReactNode } from 'react';

import ChannelButton from './ChannelButton';
import { CHANNELS } from './layout';

export type ChannelRow = Readonly<{
  label: string;
  mark: ReactNode;
  network: string;
  number: string;
  show: string;
}>;

const STEP: Readonly<
  Record<string, (current: number, count: number) => number>
> = {
  ArrowDown: (current) => current + 1,
  ArrowLeft: (current) => current - 1,
  ArrowRight: (current) => current + 1,
  ArrowUp: (current) => current - 1,
  End: (_current, count) => count - 1,
  Home: () => 0,
};

/**
 * The remote's channels (HMFinal `e2-rem`; up/down sit in its label row,
 * `ChannelArrows`). The list is a radio group: one tab stop on the channel
 * that's on; arrows, Home and End change channel and move focus with it.
 */
export default function ChannelList({
  current,
  onTune,
  onWarm,
  rows,
}: Readonly<{
  current: number;
  onTune: (index: number) => void;
  onWarm: (index: number) => void;
  rows: ReadonlyArray<ChannelRow>;
}>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const next = (step(current, rows.length) + rows.length) % rows.length;
    onTune(next);
    const buttons =
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons[next]?.focus();
  };

  return (
    <div
      aria-label="Channels"
      className={CHANNELS}
      onKeyDown={onKeyDown}
      role="radiogroup"
    >
      {rows.map((row, index) => (
        <ChannelButton
          index={index}
          key={row.number}
          on={index === current}
          onTune={onTune}
          onWarm={onWarm}
          row={row}
        />
      ))}
    </div>
  );
}
