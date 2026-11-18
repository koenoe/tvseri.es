'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { useDragControls } from 'motion/react';
import * as m from 'motion/react-m';
import { Reorder } from 'motion/react-m';
import Image from 'next/image';
import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  memo,
  type PointerEvent,
  useCallback,
  useRef,
} from 'react';

import { closeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { isTmdbImage } from '@/lib/media/isTmdbImage';
import MoveMenu from './MoveMenu';
import { SHELF_ROW_CLASS } from './shelfLook';

/** Critically damped: the rows slide into place without overshooting */
const SPRING = { bounce: 0, type: 'spring', visualDuration: 0.22 } as const;
/** Lifted: a little larger; its fill and shadow fade in on a layer below (opacity only) */
const ROW = { lifted: { scale: 1.03 }, rest: { scale: 1 } } as const;
const LAYER = { lifted: { opacity: 1 }, rest: { opacity: 0 } } as const;
const EXIT = { opacity: 0 } as const;

/**
 * Every child sits above the lift layer (positioned, in order), without
 * making the row a stacking context, so the Move menu stays above the rows
 * below it. Hover lifts the fill; a row grabbed with the keyboard shows the
 * focus ring.
 */
const CLASSES = cn(
  SHELF_ROW_CLASS,
  'group/row transition-colors *:relative hover:bg-white/7 pointer-fine:cursor-grab pointer-fine:active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
);

type Props = Readonly<{
  count: number;
  /** The keyboard instructions */
  describedBy: string;
  index: number;
  onDragEnd: (provider: WatchProvider) => void;
  onDragStart: (provider: WatchProvider) => void;
  onKey: (provider: WatchProvider, event: KeyboardEvent<HTMLElement>) => void;
  onLeave: (provider: WatchProvider, event: FocusEvent<HTMLElement>) => void;
  onMove: (provider: WatchProvider, to: number) => void;
  onRemove: (provider: WatchProvider, event: MouseEvent<HTMLElement>) => void;
  provider: WatchProvider;
}>;

/**
 * One of your services in the ranked list (Motion's `Reorder.Item`):
 * ⋮⋮ handle, place, logo, name, × to remove. A mouse or pen drags the
 * whole row; touch drags by the handle only, so a swipe over the row still
 * scrolls the page. Focused, Space picks the row
 * up, the arrow keys move it, Space drops it, Escape puts it back.
 */
function ServiceRow({
  count,
  describedBy,
  index,
  onDragEnd,
  onDragStart,
  onKey,
  onLeave,
  onMove,
  onRemove,
  provider,
}: Props) {
  const controls = useDragControls();
  const moved = useRef(false);
  const grab = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      moved.current = false;
      controls.start(event);
    },
    [controls],
  );
  // A mouse or pen drags the whole row; touch only the handle, so a swipe
  // over the list still scrolls. The handle and × handle their own presses.
  const grabRow = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (
        event.pointerType !== 'touch' &&
        !(event.target instanceof Element && event.target.closest('button'))
      ) {
        grab(event);
      }
    },
    [grab],
  );
  const start = useCallback(() => {
    moved.current = true;
    onDragStart(provider);
  }, [onDragStart, provider]);
  const end = useCallback(() => onDragEnd(provider), [onDragEnd, provider]);
  const dragged = useCallback(() => {
    const was = moved.current;
    moved.current = false;
    return was;
  }, []);
  const key = useCallback(
    (event: KeyboardEvent<HTMLElement>) => onKey(provider, event),
    [onKey, provider],
  );
  const leave = useCallback(
    (event: FocusEvent<HTMLElement>) => onLeave(provider, event),
    [onLeave, provider],
  );
  const remove = useCallback(
    (event: MouseEvent<HTMLElement>) => onRemove(provider, event),
    [onRemove, provider],
  );

  const label = `${provider.name}, ${index + 1} of ${count}`;
  const removeLabel = `Remove ${provider.name}`;
  const unoptimized = !isTmdbImage(provider.logo);
  return (
    <Reorder.Item
      animate="rest"
      aria-describedby={describedBy}
      aria-label={label}
      as="li"
      className={CLASSES}
      dragControls={controls}
      dragListener={false}
      exit={EXIT}
      initial={false}
      layout="position"
      onBlur={leave}
      onDragEnd={end}
      onDragStart={start}
      onKeyDown={key}
      onPointerDown={grabRow}
      transition={SPRING}
      value={provider}
      variants={ROW}
      whileDrag="lifted"
    >
      <m.span
        aria-hidden="true"
        className="pointer-events-none !absolute inset-0 rounded-12 bg-[#2a3334] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14),0_18px_36px_-12px_rgb(0_0_0/0.75)]"
        variants={LAYER}
      />
      <MoveMenu
        count={count}
        dragged={dragged}
        index={index}
        onGrab={grab}
        onMove={onMove}
        provider={provider}
      />
      <span className="w-4 shrink-0 text-center text-meta font-semibold text-white/60 tabular-nums">
        {index + 1}
      </span>
      <Image
        alt=""
        className="size-9 shrink-0 rounded-10"
        draggable={false}
        height={36}
        src={provider.logo}
        unoptimized={unoptimized}
        width={36}
      />
      <span className="flex min-w-0 flex-1 flex-col pl-0.5 leading-[18px]">
        <b className="truncate text-body-sm leading-[18px] font-medium">
          {provider.name}
        </b>
      </span>
      <button
        aria-label={removeLabel}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-10 text-white/60 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white max-md:size-11"
        data-remove=""
        onClick={remove}
        title={removeLabel}
        type="button"
      >
        <Icon glyph={closeGlyph} size={16} />
      </button>
    </Reorder.Item>
  );
}

const MemoServiceRow = memo(ServiceRow);
MemoServiceRow.displayName = 'ServiceRow';

export default MemoServiceRow;
