// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { popLayer, pushLayer } from '@/components/ui/layer/topLayer';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';

import useAutoAdvance from './useAutoAdvance';

let report: (ratio: number) => void = () => {};
class FakeIntersection {
  constructor(
    callback: (entries: Array<{ intersectionRatio: number }>) => void,
  ) {
    report = (ratio) => callback([{ intersectionRatio: ratio }]);
  }
  observe = vi.fn();
  disconnect = vi.fn();
}

type State = ReturnType<typeof useAutoAdvance>;
let state: State;
const onBackInView = vi.fn();

function Probe() {
  state = useAutoAdvance({ onBackInView });
  return <section ref={state.observe} />;
}

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: hidden,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useAutoAdvance', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeIntersection);
    onBackInView.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setHidden(false);
    document.body.innerHTML = '';
  });

  it('runs once hydrated, with nothing holding it', () => {
    render(<Probe />);
    expect(state.running).toBe(true);
  });

  it('holds below half on screen and calls back when it is back', () => {
    render(<Probe />);
    act(() => report(0.25));
    expect(state.running).toBe(false);
    act(() => report(0.5));
    expect(state.running).toBe(true);
    expect(onBackInView).toHaveBeenCalledOnce();
  });

  it('holds while the tab is hidden', () => {
    render(<Probe />);
    act(() => setHidden(true));
    expect(state.running).toBe(false);
    act(() => setHidden(false));
    expect(state.running).toBe(true);
  });

  it('holds while a dialog or search is open over the page', () => {
    render(<Probe />);
    const dialog = document.createElement('dialog');
    act(() => pushLayer(dialog));
    expect(state.running).toBe(false);
    act(() => popLayer(dialog));
    expect(state.running).toBe(true);
  });

  it('holds while the menu makes the page inert', async () => {
    const { container } = render(<Probe />);
    act(() => container.setAttribute('inert', ''));
    await waitFor(() => expect(state.running).toBe(false));
    act(() => container.removeAttribute('inert'));
    await waitFor(() => expect(state.running).toBe(true));
  });

  describe('a reader who asked for reduced motion', () => {
    let reduce = true;
    let change = () => {};
    beforeEach(() => {
      reduce = true;
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
          addEventListener: (_type: string, listener: () => void) => {
            change = listener;
          },
          get matches() {
            return query === REDUCED_MOTION && reduce;
          },
          media: query,
          removeEventListener: vi.fn(),
        })),
      );
    });

    it('never starts: it shows as paused by the pause button', () => {
      vi.useFakeTimers();
      render(<Probe />);
      expect(state.running).toBe(false);
      expect(state.pauses.user).toBe(true);
      expect(state.userChose).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      vi.useRealTimers();
    });

    it('runs once the reader presses play, and pauses again on a press', () => {
      render(<Probe />);
      act(() => state.pause('user', false));
      expect(state.running).toBe(true);
      expect(state.userChose).toBe(true);
      act(() => state.pause('user', true));
      expect(state.running).toBe(false);
    });

    it('follows the setting while the reader has not pressed', () => {
      render(<Probe />);
      act(() => {
        reduce = false;
        change();
      });
      expect(state.running).toBe(true);
      act(() => {
        reduce = true;
        change();
      });
      expect(state.running).toBe(false);
    });

    it('keeps the reader’s press over a later change of the setting', () => {
      render(<Probe />);
      act(() => state.pause('user', false));
      act(() => {
        reduce = false;
        change();
      });
      act(() => {
        reduce = true;
        change();
      });
      expect(state.running).toBe(true);
    });
  });

  it('every reason holds it on its own; no timer runs meanwhile', () => {
    vi.useFakeTimers();
    render(<Probe />);
    act(() => state.pause('hover', true));
    act(() => state.pause('user', true));
    act(() => state.pause('hover', false));
    expect(state.running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    act(() => state.pause('user', false));
    expect(state.running).toBe(true);
    vi.useRealTimers();
  });
});
