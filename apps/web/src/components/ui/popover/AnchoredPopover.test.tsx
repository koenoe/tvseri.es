// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AnchoredPopover from './AnchoredPopover';

describe('AnchoredPopover: re-placing on scroll', () => {
  let frames: Array<FrameRequestCallback> = [];
  const flush = () =>
    act(() => {
      const due = frames;
      frames = [];
      for (const run of due) {
        run(0);
      }
    });

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => {
      frames.push(run);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const setup = () => {
    const button = document.createElement('button');
    document.body.append(button);
    const anchor = vi.fn(() => button);
    const dismiss = vi.fn();
    const place = vi.fn();
    render(
      <AnchoredPopover anchor={anchor} onDismiss={dismiss} place={place}>
        <div data-testid="list">tickets</div>
      </AnchoredPopover>,
    );
    place.mockClear();
    return place;
  };

  it('follows a scroll outside it (a rail under the anchor)', () => {
    const place = setup();
    fireEvent.scroll(window);
    flush();
    expect(place).toHaveBeenCalledTimes(1);
  });

  it('stays put while a list inside it scrolls: its anchor has not moved', () => {
    const place = setup();
    fireEvent.scroll(screen.getByTestId('list'));
    flush();
    expect(place).not.toHaveBeenCalled();
  });
});
