// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react';
import { Activity, type FocusEvent, type PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useLinkIntent, {
  claimIntent,
  HOVER_INTENT_MS,
  resetIntents,
} from './useLinkIntent';

/** `matchMedia` saying whether the viewer asks for reduced motion */
const stubMotion = (reduce: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        addEventListener: () => undefined,
        matches: reduce && query.includes('reduce'),
        media: query,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );

/** A pointer event of this kind, as React hands it over */
const pointer = (pointerType: string) =>
  ({ pointerType }) as unknown as PointerEvent<Element>;
const mouse = pointer('mouse');
const touch = pointer('touch');

/** A focus on a link that shows (keyboard) or doesn't show (a press) a ring */
const focusOn = (visible: boolean) =>
  ({
    currentTarget: { matches: () => visible },
  }) as unknown as FocusEvent<Element>;
const keyboardFocus = focusOn(true);

const BEAR = '/136315/the-bear';

/** A link on a page, its intent read back */
const probe = { focus: (): void => undefined, intent: false };
function Probe() {
  const link = useLinkIntent(BEAR);
  probe.intent = link.intent;
  probe.focus = () => link.handlers.onFocus(keyboardFocus);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  stubMotion(false);
  resetIntents();
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.removeAttribute('data-flat-glass');
});

describe('useLinkIntent: the viewer is about to follow a link', () => {
  it('a pointer passing over does not count; one that rests 150ms does', () => {
    const { result } = renderHook(() => useLinkIntent(BEAR));
    act(() => result.current.handlers.onPointerEnter(mouse));
    act(() => vi.advanceTimersByTime(HOVER_INTENT_MS - 1));
    act(() => result.current.handlers.onPointerLeave());
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.intent).toBe(false);
    act(() => result.current.handlers.onPointerEnter(mouse));
    act(() => vi.advanceTimersByTime(HOVER_INTENT_MS));
    expect(result.current.intent).toBe(true);
    expect(HOVER_INTENT_MS).toBe(150);
  });

  it('keyboard focus counts at once', () => {
    const { result } = renderHook(() => useLinkIntent(BEAR));
    act(() => result.current.handlers.onFocus(keyboardFocus));
    expect(result.current.intent).toBe(true);
  });

  // A tap costs the page's one render, as any link's: no prefetch of its own
  it('a press is no intent: not the touch, not the focus it brings, not a hover cut short', () => {
    const { result } = renderHook(() => useLinkIntent(BEAR));
    const { handlers } = result.current;
    act(() => handlers.onPointerEnter(touch));
    act(() => vi.advanceTimersByTime(500));
    act(() => {
      handlers.onPointerDown();
      handlers.onFocus(keyboardFocus);
      handlers.onPointerUp();
    });
    expect(result.current.intent).toBe(false);

    // a mouse that clicks before it has rested
    act(() => result.current.handlers.onPointerEnter(mouse));
    act(() => vi.advanceTimersByTime(50));
    act(() => result.current.handlers.onPointerDown());
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.intent).toBe(false);
  });

  it('a focus without a ring (a mouse press) is no intent', () => {
    const { result } = renderHook(() => useLinkIntent(BEAR));
    act(() => result.current.handlers.onFocus(focusOn(false)));
    expect(result.current.intent).toBe(false);
  });

  it('holds only while the pointer or focus stays, and only for its href', () => {
    const { rerender, result } = renderHook(({ href }) => useLinkIntent(href), {
      initialProps: { href: BEAR },
    });
    act(() => result.current.handlers.onFocus(keyboardFocus));
    act(() => result.current.handlers.onBlur());
    expect(result.current.intent).toBe(false);
    resetIntents();
    act(() => result.current.handlers.onFocus(keyboardFocus));
    expect(result.current.intent).toBe(true);
    // a carousel's next slide, a card kept per show: new intent needed
    rerender({ href: '/1396/breaking-bad' });
    expect(result.current.intent).toBe(false);
    rerender({ href: BEAR });
    expect(result.current.intent).toBe(false);
  });

  it('a pending hover ends with its href and with the link', () => {
    const { rerender, result, unmount } = renderHook(
      ({ href }) => useLinkIntent(href),
      { initialProps: { href: BEAR } },
    );
    act(() => result.current.handlers.onPointerEnter(mouse));
    rerender({ href: '/1396/breaking-bad' });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.intent).toBe(false);
    expect(claimIntent(BEAR)).toBe(true);

    const onIntent = vi.fn();
    const other = renderHook(() =>
      useLinkIntent('/1399/game-of-thrones', { onIntent }),
    );
    act(() => other.result.current.handlers.onPointerEnter(mouse));
    unmount();
    other.unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(onIntent).not.toHaveBeenCalled();
  });

  it('acts once per page per session, whichever link shows it', () => {
    const onIntent = vi.fn();
    const first = renderHook(() => useLinkIntent(BEAR, { onIntent }));
    act(() => first.result.current.handlers.onFocus(keyboardFocus));
    const second = renderHook(() => useLinkIntent(BEAR, { onIntent }));
    act(() => second.result.current.handlers.onFocus(keyboardFocus));
    expect(onIntent).toHaveBeenCalledOnce();
    expect(second.result.current.intent).toBe(false);
    expect(claimIntent(BEAR)).toBe(false);
  });

  it('a link that never opens whole has no intent', () => {
    const onIntent = vi.fn();
    const { result } = renderHook(() =>
      useLinkIntent(BEAR, { enabled: false, onIntent }),
    );
    act(() => result.current.handlers.onFocus(keyboardFocus));
    expect(result.current.intent).toBe(false);
    expect(onIntent).not.toHaveBeenCalled();
  });

  it('welcomes motion unless the viewer asks for less or the device is slow', () => {
    const plain = renderHook(() => useLinkIntent('/a'));
    act(() => plain.result.current.handlers.onPointerDown());
    expect(plain.result.current.motion).toBe(true);

    stubMotion(true);
    const reduced = renderHook(() => useLinkIntent('/b'));
    act(() => reduced.result.current.handlers.onFocus(keyboardFocus));
    expect(reduced.result.current.motion).toBe(false);

    stubMotion(false);
    document.documentElement.setAttribute('data-flat-glass', '');
    const slow = renderHook(() => useLinkIntent('/c'));
    act(() => slow.result.current.handlers.onPointerDown());
    expect(slow.result.current.motion).toBe(false);
  });

  // After the click Next keeps the page in a hidden <Activity>: no leave or
  // blur comes, and a link left upgraded would re-fetch on every refresh
  it('ends when the page is hidden, so Back shows the link at rest', () => {
    const page = (mode: 'hidden' | 'visible') => (
      <Activity mode={mode}>
        <Probe />
      </Activity>
    );
    const { rerender } = render(page('visible'));
    act(() => probe.focus());
    expect(probe.intent).toBe(true);
    rerender(page('hidden'));
    rerender(page('visible'));
    expect(probe.intent).toBe(false);
  });
});
