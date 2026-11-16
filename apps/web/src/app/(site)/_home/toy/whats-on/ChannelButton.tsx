'use client';

import { memo, useCallback } from 'react';

import cn from '@/lib/cn';

import type { ChannelRow } from './ChannelList';
import { CHANNEL, CHANNEL_ON } from './layout';

/**
 * One channel on the remote (HMFinal `e2-chr`): number, service mark,
 * service and show. 48px tall, 10px corners; white/6 on hover, white/12 and
 * white text when it's on. Memoised: a change of channel re-renders only the
 * two buttons whose state changed.
 */
function ChannelButton({
  index,
  on,
  onTune,
  onWarm,
  row,
}: Readonly<{
  index: number;
  on: boolean;
  onTune: (index: number) => void;
  onWarm: (index: number) => void;
  row: ChannelRow;
}>) {
  const tune = useCallback(() => onTune(index), [index, onTune]);
  const warm = useCallback(() => onWarm(index), [index, onWarm]);
  const classes = cn(CHANNEL, on && CHANNEL_ON);
  const numberClasses = cn(
    'text-meta tabular-nums',
    on ? 'text-white' : 'text-white/60',
  );
  const networkClasses = cn(
    'truncate text-body-sm font-medium',
    on ? 'text-white' : 'text-white/80',
  );
  return (
    <button
      aria-checked={on}
      aria-label={row.label}
      className={classes}
      onClick={tune}
      onFocus={warm}
      onPointerEnter={warm}
      role="radio"
      tabIndex={on ? 0 : -1}
      type="button"
    >
      <span className={numberClasses}>{row.number}</span>
      {row.mark}
      <span className="flex min-w-0 flex-col">
        <span className={networkClasses}>{row.network}</span>
        <span className="truncate text-caption text-white/60">{row.show}</span>
      </span>
    </button>
  );
}

const MemoChannelButton = memo(ChannelButton);
MemoChannelButton.displayName = 'ChannelButton';

export default MemoChannelButton;
