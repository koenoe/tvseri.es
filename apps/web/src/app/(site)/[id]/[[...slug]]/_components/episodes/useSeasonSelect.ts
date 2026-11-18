'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useMemo,
  useRef,
  useState,
} from 'react';
import { moveSelection } from '@/lib/grid/moveSelection';
import { createLoader } from '@/lib/lazy/createLoader';
import whenIdle from '@/lib/lazy/whenIdle';
import type { SeriesBase } from '@/lib/marking/types';

import { useShow } from '../../_lib/ShowProvider';
import { selectSeason } from '../../_lib/urlState';
import useRuntimes from '../../_lib/useRuntimes';
import {
  type EpisodesBySeason,
  filterRows,
  optionId,
  PANEL_QUERY_ABOVE,
  panelRows,
  runtimesBySeason,
  TYPE_AHEAD_MS,
  typeAhead,
} from './panelRows';

/**
 * The panel loads on first intent (hover, focus, press) and renders without
 * a Suspense boundary once loaded: React throttles Suspense reveals (~300ms),
 * which a `lazy()` panel would pay on every first open.
 */
export const panel = createLoader(() =>
  import('./SeasonPanel').then((module) => module.default),
);
// 3.5 KB: fetched when the browser is idle, so even a first tap opens at once.
if (typeof window !== 'undefined') {
  whenIdle(panel.preload);
}

type PanelState = Readonly<{
  open: boolean;
  /** The keyboard row (index in the filtered rows); undefined = the selected one. */
  active: number | undefined;
  /** Moved with the keyboard: the row shows its ring. */
  keyboard: boolean;
  query: string;
}>;

const CLOSED: PanelState = {
  active: undefined,
  keyboard: false,
  open: false,
  query: '',
};

/**
 * The season select's state: open, the rows (filtered by "Go to season"
 * on a show with many), the keyboard row, and the keys, blur and picks that
 * move it (a select-only combobox, WAI-ARIA APG).
 */
export default function useSeasonSelect({
  listboxId,
  nextUp,
  personal,
  seasonNumber,
  seriesId,
  trigger,
  view,
}: Readonly<{
  listboxId: string;
  nextUp: EpisodeRef | null;
  personal: boolean;
  seasonNumber: number;
  seriesId: number;
  trigger: RefObject<HTMLButtonElement | null>;
  view: SeriesBase;
}>) {
  const show = useShow();
  const [state, setState] = useState<PanelState>(CLOSED);
  const typed = useRef({ at: 0, buffer: '' });

  const many =
    show.seasons.filter((season) => season.seasonNumber > 0).length >
    PANEL_QUERY_ABOVE;
  // Open: the show's runtimes load (one CDN-cached request), so the rows'
  // lines weigh each episode by its runtime; equal widths until they arrive.
  const runtimes = useRuntimes(seriesId, state.open);
  const episodes = useMemo<EpisodesBySeason>(
    () => runtimesBySeason(runtimes ?? {}),
    [runtimes],
  );
  const allRows = useMemo(
    () => (state.open ? panelRows(show, view, nextUp, episodes, personal) : []),
    [state.open, view, show, nextUp, episodes, personal],
  );
  const rows = useMemo(
    () => (many ? filterRows(allRows, state.query) : allRows),
    [allRows, many, state.query],
  );
  const selectedIndex = Math.max(
    0,
    rows.findIndex((row) => row.seasonNumber === seasonNumber),
  );
  const active =
    state.active === undefined || state.active >= rows.length
      ? selectedIndex
      : state.active;
  const activeRow = state.open ? rows[active] : undefined;
  const activeId = activeRow
    ? optionId(listboxId, activeRow.seasonNumber)
    : undefined;

  const close = (refocus: boolean) => {
    setState(CLOSED);
    if (refocus) {
      trigger.current?.focus({ preventScroll: true });
    }
  };
  const pick = (season: number) => {
    close(true);
    if (season !== seasonNumber) {
      selectSeason(season);
    }
  };
  const openPanel = (keyboard: boolean) => {
    const reveal = () => setState({ ...CLOSED, keyboard, open: true });
    if (panel.get()) {
      reveal();
    } else {
      // a failed chunk does nothing now; the next press loads it again
      panel.load().then(reveal, () => undefined);
    }
  };
  const toggle = () => {
    if (state.open) {
      setState(CLOSED);
    } else {
      openPanel(false);
    }
  };
  const move = (index: number) =>
    setState((current) => ({
      ...current,
      active: Math.max(0, Math.min(rows.length - 1, index)),
      keyboard: true,
    }));

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const { key } = event;
    const target = event.target as HTMLElement;
    const inInput = target.tagName === 'INPUT';
    const onList = target.getAttribute('role') === 'listbox';
    if (!state.open) {
      if ((key === 'ArrowDown' || key === 'ArrowUp') && !inInput) {
        event.preventDefault();
        openPanel(true);
      }
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (!rows.length) {
      return;
    }
    if (
      key === 'ArrowDown' ||
      key === 'ArrowUp' ||
      ((key === 'Home' || key === 'End') && !inInput)
    ) {
      event.preventDefault();
      move(moveSelection([{ columns: 1, size: rows.length }], active, key));
    } else if (key === 'Enter') {
      // A focused row's own click handles Enter, unless the keyboard moved.
      if (target === trigger.current || inInput || onList || state.keyboard) {
        event.preventDefault();
        const row = rows[active];
        if (row) {
          pick(row.seasonNumber);
        }
      }
    } else if (!inInput && /^[0-9sSpP]$/.test(key)) {
      const now = Date.now();
      const buffer =
        now - typed.current.at < TYPE_AHEAD_MS ? typed.current.buffer : '';
      const found = typeAhead(rows, buffer, key);
      typed.current = { at: now, buffer: found.buffer };
      if (found.index >= 0) {
        event.preventDefault();
        move(found.index);
      }
    }
  };

  const onQuery = (query: string) =>
    setState((current) => ({ ...current, active: undefined, query }));

  // Tab, or any focus move out of the select (trigger, panel, sheet), closes.
  const onBlur = (event: FocusEvent<HTMLSpanElement>) => {
    const next = event.relatedTarget;
    if (
      !state.open ||
      (next instanceof Node && event.currentTarget.contains(next)) ||
      (next === null && !document.hasFocus())
    ) {
      return;
    }
    setState(CLOSED);
  };

  return {
    active,
    activeId,
    close,
    many,
    onBlur,
    onKeyDown,
    onQuery,
    pick,
    rows,
    state,
    toggle,
  };
}
