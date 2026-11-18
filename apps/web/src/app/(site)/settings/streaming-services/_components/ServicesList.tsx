'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { AnimatePresence } from 'motion/react';
import { Reorder } from 'motion/react-m';
import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';

import MaxMotion from '@/components/motion/MaxMotion';
import { gripGlyph, keyboardGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { movedOrder } from '@/lib/watchProviders/servicesReducer';
import { announce } from '../_lib/announce';
import ServiceRow from './ServiceRow';
import { SHELF_HINT_CLASS, SHELF_LIST_CLASS } from './shelfLook';

type List = ReadonlyArray<WatchProvider>;
type Held = Readonly<{ from: number; provider: WatchProvider }>;

const idsOf = (list: List) => list.map((provider) => provider.id);

/**
 * Your services as a ranked list in Motion's `Reorder` (`domMax`, loaded
 * once per page), with the line that says what the order does. While a row
 * is dragged the list shows the draft order and the drop saves it once; a
 * keyboard grab saves at each step (it has no drop event), Escape's
 * restore included. The draft belongs to the list it was made from: once
 * the saved list changes (the save landed, or failed back) that one shows.
 * Every move and removal is read out through `onAnnounce`.
 */
export default function ServicesList({
  headingId,
  onAnnounce,
  onReorder,
  onToggle,
  selected,
}: Readonly<{
  /** Focus goes here when the last service is removed */
  headingId: string;
  onAnnounce: (message: string) => void;
  onReorder: (order: ReadonlyArray<number>) => void;
  onToggle: (provider: WatchProvider) => void;
  selected: List;
}>) {
  const [draft, setDraft] = useState<Readonly<{ base: List; list: List }>>();
  const [keyboard, setKeyboard] = useState<Held | null>(null);
  const held = useRef<Held | null>(null);
  const dragging = useRef<Held | null>(null);
  const latest = useRef<List>(selected);
  const hint = useId();
  const shown = draft?.base === selected ? draft.list : selected;
  latest.current = shown;
  const count = shown.length;

  const placeOf = useCallback(
    (provider: WatchProvider) =>
      latest.current.findIndex((p) => p.id === provider.id),
    [],
  );
  const hold = useCallback((next: Held | null) => {
    held.current = next;
    setKeyboard(next);
  }, []);

  const onDraft = useCallback(
    (list: Array<WatchProvider>) => {
      latest.current = list;
      setDraft({ base: selected, list });
      if (dragging.current) {
        return;
      }
      onReorder(idsOf(list));
      const grabbed = held.current?.provider;
      if (grabbed) {
        const at = list.findIndex((p) => p.id === grabbed.id);
        onAnnounce(announce.step(grabbed.name, at, list.length));
      }
    },
    [onAnnounce, onReorder, selected],
  );
  const onDragStart = useCallback(
    (provider: WatchProvider) => {
      dragging.current = { from: placeOf(provider), provider };
    },
    [placeOf],
  );
  // Motion can send the last reorder of a quick drag just after the drop:
  // the save and the read-out wait a frame for it
  const onDragEnd = useCallback(
    (provider: WatchProvider) => {
      const from = dragging.current?.from ?? placeOf(provider);
      requestAnimationFrame(() => {
        dragging.current = null;
        onReorder(idsOf(latest.current));
        onAnnounce(
          announce.moved(provider.name, from, placeOf(provider), count),
        );
      });
    },
    [count, onAnnounce, onReorder, placeOf],
  );
  const onKey = useCallback(
    (provider: WatchProvider, event: KeyboardEvent<HTMLElement>) => {
      if (
        event.target !== event.currentTarget ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }
      const mine = held.current?.provider.id === provider.id;
      if (event.key === ' ' && !event.repeat) {
        if (mine && held.current) {
          onAnnounce(
            announce.moved(
              provider.name,
              held.current.from,
              placeOf(provider),
              count,
            ),
          );
          hold(null);
        } else {
          const from = placeOf(provider);
          hold({ from, provider });
          onAnnounce(announce.pickedUp(provider.name, from, count));
        }
      } else if (event.key === 'Escape' && mine && held.current) {
        const { from } = held.current;
        hold(null);
        onAnnounce(announce.moved(provider.name, from, from, count));
      }
    },
    [count, hold, onAnnounce, placeOf],
  );
  // Motion drops a grabbed row when focus really leaves it
  const onLeave = useCallback(
    (provider: WatchProvider, event: FocusEvent<HTMLElement>) => {
      const row = event.currentTarget;
      if (held.current?.provider.id !== provider.id) {
        return;
      }
      requestAnimationFrame(() => {
        if (document.activeElement !== row) {
          hold(null);
        }
      });
    },
    [hold],
  );
  const onMove = useCallback(
    (provider: WatchProvider, to: number) => {
      const from = placeOf(provider);
      onReorder(movedOrder(latest.current, from, to));
      onAnnounce(announce.moved(provider.name, from, to, count));
    },
    [count, onAnnounce, onReorder, placeOf],
  );
  // Focus moves on to the next row's ×, or back to the title
  const onRemove = useCallback(
    (provider: WatchProvider, event: MouseEvent<HTMLElement>) => {
      const row = event.currentTarget.closest('li');
      const next = (
        row?.nextElementSibling ?? row?.previousElementSibling
      )?.querySelector<HTMLElement>('[data-remove]');
      (next ?? document.getElementById(headingId))?.focus();
      onToggle(provider);
      onAnnounce(announce.removed(provider.name, count - 1));
    },
    [count, headingId, onAnnounce, onToggle],
  );

  return (
    <>
      <HintLine count={count} keyboard={keyboard} />
      <p className="sr-only" id={hint}>
        Space picks it up, arrow keys move it, Space drops it, Escape puts it
        back.
      </p>
      <MaxMotion>
        <Reorder.Group
          as="ol"
          axis="y"
          className={SHELF_LIST_CLASS}
          onReorder={onDraft}
          values={shown as Array<WatchProvider>}
        >
          <AnimatePresence initial={false}>
            {shown.map((provider, index) => (
              <ServiceRow
                count={count}
                describedBy={hint}
                index={index}
                key={provider.id}
                onDragEnd={onDragEnd}
                onDragStart={onDragStart}
                onKey={onKey}
                onLeave={onLeave}
                onMove={onMove}
                onRemove={onRemove}
                provider={provider}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </MaxMotion>
    </>
  );
}

/**
 * Under the title: what the order does and "Drag to reorder"; one service
 * has nothing to order; while a row is held with the keyboard, the keys.
 */
function HintLine({
  count,
  keyboard,
}: Readonly<{ count: number; keyboard: Held | null }>) {
  if (keyboard) {
    return (
      <p className="-mt-1.5 flex items-start gap-2 rounded-10 bg-white/6 px-2.5 py-2 text-meta text-white/80">
        <Icon className="mt-0.5 shrink-0" glyph={keyboardGlyph} size={14} />
        <span>
          <b className="font-semibold text-white">
            {keyboard.provider.name} picked up.
          </b>{' '}
          Arrow keys move it, Space drops it, Escape puts it back.
        </span>
      </p>
    );
  }
  if (count === 1) {
    return (
      <p className={SHELF_HINT_CLASS}>
        Where to watch shows this one on every series it streams. Add another to
        set an order.
      </p>
    );
  }
  return (
    <p className={SHELF_HINT_CLASS}>
      Where to watch shows the highest one that streams a series.
      <span className="inline-flex items-center gap-1 text-white/80">
        <Icon glyph={gripGlyph} size={14} />
        Drag to reorder
      </span>
    </p>
  );
}
