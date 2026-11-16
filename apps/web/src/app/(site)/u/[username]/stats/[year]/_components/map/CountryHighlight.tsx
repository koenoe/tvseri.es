'use client';

import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
} from 'react';

/** Where an event happened: the country of the dots or row under it */
const countryOf = (event: Readonly<{ target: EventTarget }>) =>
  event.target instanceof Element
    ? (event.target.closest('[data-country]')?.getAttribute('data-country') ??
      null)
    : null;

/**
 * The map and its list, linked: pointing at or focusing a country (its dots
 * or its row) marks every element of that country `data-active`, and each
 * draws it its own way (the dots whiten, the row lifts). The server draws
 * both; this only flips one attribute, so nothing moves or re-renders.
 */
export default function CountryHighlight({
  children,
  className,
}: Readonly<{ children: ReactNode; className: string }>) {
  const root = useRef<HTMLDivElement>(null);
  const active = useRef<string | null>(null);

  const highlight = (code: string | null) => {
    const node = root.current;
    if (!node || active.current === code) {
      return;
    }
    active.current = code;
    for (const element of node.querySelectorAll('[data-active]')) {
      element.removeAttribute('data-active');
    }
    if (code) {
      const selector = `[data-country="${CSS.escape(code)}"]`;
      for (const element of node.querySelectorAll(selector)) {
        element.setAttribute('data-active', '');
      }
    }
  };
  const onPointer = (event: PointerEvent<HTMLDivElement>) =>
    highlight(countryOf(event));
  const onFocus = (event: FocusEvent<HTMLDivElement>) =>
    highlight(countryOf(event));
  const clear = () => highlight(null);

  return (
    <div
      className={className}
      onBlur={clear}
      onFocus={onFocus}
      onPointerLeave={clear}
      onPointerOver={onPointer}
      ref={root}
    >
      {children}
    </div>
  );
}
