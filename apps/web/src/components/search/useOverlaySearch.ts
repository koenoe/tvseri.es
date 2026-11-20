'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';

import { readDisplayUsername } from '@/auth/displayUsername';
import type { ArrowKey } from '@/lib/grid/moveSelection';
import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';
import getHistoryKey from '@/lib/navigation/getHistoryKey';
import { isPlainClick } from '@/lib/navigation/isPlainClick';
import { claimIntent } from '@/lib/navigation/useLinkIntent';
import { showIdOf } from '@/lib/routing/showPath';
import {
  createSearchController,
  type SearchEnv,
} from '@/lib/search/controller';
import { createSearchClient } from '@/lib/search/fetchSearch';
import { useRecents } from '@/lib/search/recents';
import {
  forgetSession,
  restoreSession,
  saveSession,
} from '@/lib/search/restore';
import type { SearchCell } from '@/lib/search/sections';
import { sessionView } from '@/lib/search/session';

import openWhenPrefetched from './openWhenPrefetched';
import { optionId } from './optionStyles';
import { createTargetPrefetch } from './targetPrefetch';

/**
 * One client per page: answers already fetched stay for the next open. A
 * signed-in viewer (the display cookie, read per query) also finds members
 * by their exact handle.
 */
const client = createSearchClient({
  members: () => readDisplayUsername(document.cookie) !== null,
});

/**
 * The overlay's search: one controller per open (restored for this history
 * entry when a result was opened from it before), the recents, and what
 * opening a result does (remember it, save the search for Back, go, close).
 * The marked result (what Enter opens) opens whole once an arrow rests on
 * it (`createTargetPrefetch`, `wholeKey`): a show's link asks for its page,
 * once per session.
 */
export default function useOverlaySearch({
  initialQuery,
  onClose,
}: Readonly<{ initialQuery?: string; onClose: () => void }>) {
  const router = useRouter();
  // below `md`: the full-screen phone layout
  const phone = useMediaQuery(PHONE);
  const recents = useRecents((store) => store.recents);
  const [wholeKey, setWholeKey] = useState<string | null>(null);
  const [session] = useState(() => {
    const historyKey = getHistoryKey();
    const restored =
      initialQuery === undefined ? restoreSession(historyKey) : null;
    return {
      controller: createSearchController(client, restored ?? undefined),
      historyKey,
      navigated: { current: false },
      target: createTargetPrefetch((cell: SearchCell) => {
        if (showIdOf(cell.href) !== null && claimIntent(cell.href)) {
          setWholeKey(cell.key);
        }
      }),
    };
  });
  const { controller, target } = session;
  // A result was opened: the overlay leaves in place rather than back into
  // the search icon, which reads as cancelled (state, for the closing render)
  const [opening, setOpening] = useState(false);
  const state = useStore(controller.store);
  // what the body draws: a keystroke changes the field, not this, until an
  // answer lands (or the selection or the stall changes)
  const drawn = useStore(
    controller.store,
    useShallow((current) => ({
      results: current.results,
      selected: current.selected,
      shown: current.shown,
      stalled: current.stalled,
    })),
  );
  const context = useMemo(
    () => ({ layout: phone ? 'phone' : 'desktop', recents }) as const,
    [phone, recents],
  );
  // Stable while typing, so the panel defers it and the results don't
  // re-render per keystroke
  const view = useMemo(() => sessionView(drawn, context), [drawn, context]);

  const remember = useCallback(
    (cell: SearchCell) => {
      target.stop();
      useRecents.getState().add(cell);
      saveSession(session.historyKey, controller.store.getState());
      session.navigated.current = true;
      setOpening(true);
    },
    [controller, session, target],
  );
  const env = useMemo<SearchEnv>(
    () => ({
      context,
      onOpen: (cell) => {
        remember(cell);
        // Enter-ahead opens before the page was prefetched: wait for it
        openWhenPrefetched(cell.href, {
          prefetch: (href) => router.prefetch(href),
          push: (href) => router.push(href),
        });
        onClose();
      },
      onTarget: (cell) => {
        // the route's shell only: a landed answer is no intent yet, and the
        // page itself costs a server render per typing pause. An arrow
        // onto a result is intent (`move`)
        router.prefetch(cell.href);
      },
    }),
    [context, onClose, remember, router],
  );

  // Stop at once, not after the fade: a pending Enter-ahead answer landing
  // during the fade must not navigate.
  const close = useCallback(() => {
    controller.dispose();
    target.cancel();
    onClose();
  }, [controller, onClose, target]);

  // stable, so a keystroke doesn't re-render the results (memo `SearchBody`)
  const choose = useCallback(
    (cell: SearchCell, event: MouseEvent<HTMLAnchorElement>) => {
      if (isPlainClick(event)) {
        remember(cell);
        close();
      }
    },
    [close, remember],
  );
  const retry = useCallback(() => controller.retry(env), [controller, env]);

  return {
    choose,
    /** Escape, the dim, the cross: stop the search and close. */
    close,
    enter: () => controller.enter(env),
    /** The overlay has closed: stop, and forget a search that was dismissed. */
    finish: () => {
      controller.dispose();
      target.cancel();
      if (!session.navigated.current) {
        forgetSession(session.historyKey);
      }
      return session.navigated.current;
    },
    /** Closed from outside (⌘K again): stop the search at once. */
    halt: () => {
      controller.dispose();
      target.cancel();
    },
    input: (query: string) => {
      // typing on: the next answer marks its own first result
      target.cancel();
      controller.input(query, env);
    },
    move: (key: ArrowKey) => {
      const next = sessionView(controller.move(key, env), context);
      const cell = next.cells[next.selected];
      if (cell) {
        target.mark(cell);
        document
          .getElementById(optionId(cell.key))
          ?.scrollIntoView({ block: 'nearest' });
      }
    },
    /** A result was opened: the close fades in place */
    opening,
    phone,
    retry,
    /**
     * The dialog opened (or was re-attached after a stop: Strict Mode in
     * development): take input, and search a prefilled query (the 404 field,
     * keys typed while it loaded: `query`, the latest) at once.
     */
    start: (query: string | undefined = initialQuery) => {
      controller.resume(env);
      if (query?.trim() && controller.store.getState().query !== query) {
        controller.input(query, env);
        controller.flush(env);
      }
    },
    state,
    view,
    /** The result whose page opens whole (`WholeResult`) */
    wholeKey,
  };
}

export type OverlaySearch = ReturnType<typeof useOverlaySearch>;
