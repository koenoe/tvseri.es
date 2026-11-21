'use client';

import { memo, useCallback } from 'react';

import cn from '@/lib/cn';

import type { ChannelRow } from './ChannelList';
import { CHANNEL, CHANNEL_ON, CHANNEL_PILL } from './layout';

/**
 * One channel on the remote: number, service mark,
 * service and show. Memoised: a change of channel re-renders only the
 * two buttons whose state changed. The channel on draws the highlight
 * (`[data-pill]`), which glides from the channel before (`WhatsOnRemote`).
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
      {on ? (
        <span aria-hidden="true" className={CHANNEL_PILL} data-pill="" />
      ) : null}
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
