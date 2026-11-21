// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import holdInPlace from './holdInPlace';

/** An element whose top the test moves, as a fold above it would */
function movable(top: number) {
  const element = document.createElement('button');
  document.body.append(element);
  const box = { top };
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
    () => ({ top: box.top }) as DOMRect,
  );
  return { box, element };
}

let scrollBy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('holdInPlace', () => {
  it('scrolls by however far the element moved, frame by frame, while the fold runs', () => {
    const { box, element } = movable(450);
    holdInPlace(element, 320);
    box.top = 350;
    vi.advanceTimersByTime(16);
    expect(scrollBy).toHaveBeenLastCalledWith({
      behavior: 'instant',
      top: -100,
    });
    // the scroll put it back; the fold moves it again
    box.top = 400;
    vi.advanceTimersByTime(16);
    expect(scrollBy).toHaveBeenLastCalledWith({
      behavior: 'instant',
      top: -50,
    });
  });

  it('scrolls nothing while the element stays put', () => {
    const { element } = movable(450);
    holdInPlace(element, 320);
    vi.advanceTimersByTime(100);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('lets go once the fold has ended', () => {
    const { box, element } = movable(450);
    holdInPlace(element, 320);
    vi.advanceTimersByTime(400);
    box.top = 100;
    vi.advanceTimersByTime(100);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('lets go when the viewer scrolls themselves', () => {
    const { box, element } = movable(450);
    holdInPlace(element, 320);
    window.dispatchEvent(new Event('wheel'));
    box.top = 100;
    vi.advanceTimersByTime(100);
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
