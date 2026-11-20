// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';

import { UP_NEXT_HEADING } from '../up-next/upNextHeading';
import GetStartedFold from './GetStartedFold';

/** The card above Up next, as the overview draws them */
const overview = (done: boolean) => (
  <MotionProvider>
    <button type="button">Elsewhere</button>
    <GetStartedFold done={done}>
      <button type="button">Netflix</button>
    </GetStartedFold>
    <section aria-labelledby={UP_NEXT_HEADING}>
      <h2 id={UP_NEXT_HEADING}>Up next</h2>
    </section>
  </MotionProvider>
);

describe('GetStartedFold', () => {
  it('hands focus held in the card to Up next’s heading as it folds away', () => {
    const { rerender } = render(overview(false));
    act(() => screen.getByRole('button', { name: 'Netflix' }).focus());
    rerender(overview(true));
    const heading = screen.getByRole('heading', { name: 'Up next' });
    expect(document.activeElement).toBe(heading);
    // programmatic only: Tab never stops on it
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });

  it('leaves focus that is elsewhere where it is', () => {
    const { rerender } = render(overview(false));
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
    act(() => elsewhere.focus());
    rerender(overview(true));
    expect(document.activeElement).toBe(elsewhere);
  });
});
