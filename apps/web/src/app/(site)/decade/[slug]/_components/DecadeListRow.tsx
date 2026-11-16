'use client';

import { type CSSProperties, memo, useCallback } from 'react';

import type { LandscapeShow } from '../_data/landscape';

type Props = Readonly<{
  index: number;
  onOpen: (index: number) => void;
  selected: boolean;
  show: Pick<LandscapeShow, 'bar' | 'title' | 'votes'>;
}>;

/**
 * A phone row of the landscape: the rank, the title, a
 * 4px bar proportional to the votes, the count. Tapping opens the show's
 * card as a sheet; the selected row is lit.
 */
function DecadeListRow({ index, onOpen, selected, show }: Props) {
  const onClick = useCallback(() => onOpen(index), [index, onOpen]);
  const bar: CSSProperties = { width: `${show.bar}%` };
  const rank = index + 1;
  const label = `${rank}. ${show.title}, ${show.votes} votes`;
  return (
    <li>
      <button
        aria-current={selected ? 'true' : undefined}
        aria-haspopup="dialog"
        aria-label={label}
        className="grid w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-12 px-2 py-2.5 text-left transition-colors duration-200 aria-[current]:bg-white/8 active:bg-white/6"
        onClick={onClick}
        type="button"
      >
        <span className="text-right text-title-3 text-white/60 tabular-nums">
          {rank}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body-sm font-semibold text-white">
            {show.title}
          </span>
          <span className="mt-2 block h-1 w-full rounded-2 bg-white/12">
            <span className="block h-1 rounded-2 bg-white/70" style={bar} />
          </span>
        </span>
        <span className="text-caption text-white/60 tabular-nums">
          {show.votes}
        </span>
      </button>
    </li>
  );
}

const MemoDecadeListRow = memo(DecadeListRow);
MemoDecadeListRow.displayName = 'DecadeListRow';

export default MemoDecadeListRow;
