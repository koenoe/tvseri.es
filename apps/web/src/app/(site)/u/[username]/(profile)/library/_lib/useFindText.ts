'use client';

import { useCallback, useRef, useState } from 'react';

/** Find asks this long after the last key: one navigation per pause */
const FIND_PAUSE_MS = 150;

/**
 * Find's text, the reader's own while they type. Each pause asks for the
 * trimmed text (`onFind`, a URL navigation); the URL's `q` lags behind and
 * lands for each ask, maybe after newer keys, so a `q` this field asked
 * for never writes back. A `q` it never asked for (back/forward, a link)
 * is someone else's navigation and replaces the text. Escape (`clear`)
 * asks at once.
 *
 * Debounced, not `useDeferredValue`: the results are the server's page for
 * the URL, a navigation rather than a render, and deferring a value does
 * not save requests (react.dev: "does not by itself prevent extra network
 * requests").
 */
export default function useFindText(q: string, onFind: (q: string) => void) {
  const [text, setText] = useState(q);
  // The URL's last `q`, and what was asked for that has not landed yet
  const [landed, setLanded] = useState(q);
  const [asked, setAsked] = useState<ReadonlyArray<string>>([]);
  // Back/forward to a value still in `asked` passes for its late landing:
  // rare, and telling them apart would need the router's history
  if (landed !== q) {
    setLanded(q);
    const at = asked.indexOf(q);
    if (at === -1) {
      setText(q);
      setAsked([]);
    } else {
      setAsked(asked.slice(at + 1));
    }
  }

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = asked.at(-1) ?? q;
  const ask = (value: string) => {
    clearTimeout(timer.current);
    if (value !== latest) {
      setAsked((was) => [...was, value]);
      onFind(value);
    }
  };
  const change = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => ask(value.trim()), FIND_PAUSE_MS);
  };
  const clear = () => {
    setText('');
    ask('');
  };
  /**
   * The text as the URL should carry it now, for a sort, filter or jump
   * that navigates with it: the pause is settled, and the `q` it lands
   * with is this field's own
   */
  const settle = (): string => {
    clearTimeout(timer.current);
    const value = text.trim();
    if (value !== latest) {
      setAsked((was) => [...was, value]);
    }
    return value;
  };
  // A ref callback's cleanup: a pending ask dies with the toolbar
  const stopOnUnmount = useCallback(
    () => () => clearTimeout(timer.current),
    [],
  );

  return { change, clear, settle, stopOnUnmount, text } as const;
}

export type FindText = ReturnType<typeof useFindText>;
