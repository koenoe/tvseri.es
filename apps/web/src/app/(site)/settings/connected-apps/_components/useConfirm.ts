'use client';

import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

type TriggerRef = (node: HTMLElement | null) => void;

/**
 * Which confirm row is open, and focus back on its trigger on Cancel, as the
 * row's buttons leave with it (WCAG 2.4.3). `trigger(key)` is a stable ref
 * per key, so a trigger hidden while asking is found again when it returns.
 */
export default function useConfirm<K extends string>() {
  const [asking, setAsking] = useState<K | null>(null);
  const triggers = useRef(new Map<K, HTMLElement>());
  const refs = useRef(new Map<K, TriggerRef>());

  const trigger = useCallback((key: K): TriggerRef => {
    const known = refs.current.get(key);
    if (known) {
      return known;
    }
    const ref: TriggerRef = (node) => {
      if (node) {
        triggers.current.set(key, node);
      }
    };
    refs.current.set(key, ref);
    return ref;
  }, []);

  const cancel = () => {
    const key = asking;
    // Committed now, so a trigger hidden while asking is back to take focus
    flushSync(() => setAsking(null));
    if (key !== null) {
      triggers.current.get(key)?.focus();
    }
  };
  const close = () => setAsking(null);

  return { ask: setAsking, asking, cancel, close, trigger };
}
