// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppsAccordion, AppToggle } from './AppsAccordion';

let scrollBy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Netflix open above Prime Video, as the page draws them */
async function cards() {
  await act(async () => {
    render(
      <Suspense>
        <AppsAccordion needsYou={Promise.resolve('netflix')}>
          <AppToggle app="netflix" name="Netflix" />
          <AppToggle app="prime" name="Prime Video" />
        </AppsAccordion>
      </Suspense>,
    );
  });
}

describe('AppToggle', () => {
  it('opens its card and keeps the pressed header under the pointer while the card above shuts', async () => {
    await cards();
    const prime = screen.getByRole('button', { name: 'Open Prime Video' });
    const box = { top: 450 };
    vi.spyOn(prime, 'getBoundingClientRect').mockImplementation(
      () => ({ top: box.top }) as DOMRect,
    );
    fireEvent.click(prime);
    expect(prime.getAttribute('aria-expanded')).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Open Netflix' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
    // Netflix's body folds shut above it: the header is pulled up
    box.top = 100;
    vi.advanceTimersByTime(16);
    expect(scrollBy).toHaveBeenLastCalledWith({
      behavior: 'instant',
      top: -350,
    });
  });
});
