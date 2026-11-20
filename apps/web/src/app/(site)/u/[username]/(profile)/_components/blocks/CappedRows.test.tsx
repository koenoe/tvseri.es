// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';
import MarkingProvider from '@/lib/marking/MarkingProvider';

import CappedRows from './CappedRows';

// Motion's clock is this file's: its frame loop takes requestAnimationFrame
// as it loads, so the fake goes in before any import. A fold's middle and
// end are then frames played, never a wait on a worker's real clock.
vi.hoisted(() => {
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

const FRAME = 16;

/**
 * Plays `ms` of frames one at a time, each in its own act as a browser's
 * frame is its own task, letting the exits that finished leave the DOM
 * before the next
 */
const play = async (ms: number) => {
  for (let played = 0; played < ms; played += FRAME) {
    act(() => {
      vi.advanceTimersByTime(FRAME);
    });
    await act(async () => {});
  }
};

/** Past any fold, leave or sweep in these lanes */
const SETTLE = 1000;

/** A lane row as the lanes draw it: the poster link out of the tab order, then Keep and Hide */
const row = (title: string) => (
  <div key={title}>
    <a href={`/${title}`} tabIndex={-1}>
      poster
    </a>
    <a href={`/${title}`}>{title}</a>
    <button type="button">Keep {title}</button>
    <button type="button">Hide {title}</button>
  </div>
);

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <MarkingProvider>
    <MotionProvider>
      <section aria-labelledby="lane">
        <h2 id="lane">Lane</h2>
        {children}
      </section>
    </MotionProvider>
  </MarkingProvider>
);

const TITLES = ['One', 'Two', 'Three', 'Four', 'Five'];

type Props = Partial<ComponentProps<typeof CappedRows>>;

const lane = (titles: ReadonlyArray<string>, props: Props = {}) => (
  <CappedRows cap={2} gap="2.5" rows={titles.map(row)} {...props} />
);

const itemOf = (title: string) =>
  screen.getByRole('link', { name: title }).closest('[data-leaving-item]');

describe('CappedRows', () => {
  it('folds the rest open and moves focus to the first row it opened', () => {
    render(lane(TITLES), { wrapper });
    expect(screen.queryByRole('link', { name: 'Three' })).toBeNull();
    const button = screen.getByRole('button', { name: 'Show all 5' });
    fireEvent.click(button);
    const third = screen.getByRole('link', { name: 'Three' });
    expect(document.activeElement).toBe(third);
    // the foot controls one element that holds every row
    const controlled = document.getElementById(
      button.getAttribute('aria-controls') ?? '',
    );
    for (const title of TITLES) {
      expect(
        controlled?.contains(screen.getByRole('link', { name: title })),
      ).toBe(true);
    }
  });

  it('keeps a ul lane one list, each row its item', () => {
    render(lane(TITLES, { as: 'ul' }), { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Show all 5' }));
    const [list, ...more] = screen.getAllByRole('list');
    expect(more).toHaveLength(0);
    expect(list?.querySelectorAll(':scope > li')).toHaveLength(5);
  });

  it('draws a row once when the lane shrinks to its cap while open', () => {
    const { rerender } = render(
      <CappedRows cap={3} gap="2.5" rows={TITLES.slice(0, 4).map(row)} />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show all 4' }));
    rerender(
      <CappedRows cap={3} gap="2.5" rows={TITLES.slice(1, 4).map(row)} />,
    );
    expect(screen.getAllByRole('link', { name: 'Four' })).toHaveLength(1);
  });

  it('draws the next row once when one above the cut leaves while open', () => {
    const { rerender } = render(lane(TITLES), { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Show all 5' }));
    rerender(lane(TITLES.slice(1)));
    expect(screen.getAllByRole('link', { name: 'Three' })).toHaveLength(1);
  });

  it('draws a row once when the lane shuts after a row above the cut left', async () => {
    const { rerender } = render(lane(TITLES), { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Show all 5' }));
    rerender(lane(TITLES.slice(1)));
    // Show fewer
    fireEvent.click(screen.getByRole('button', { expanded: true }));
    // the fold shuts with Three in it: Three doesn't move up meanwhile
    expect(screen.getAllByRole('link', { name: 'Three' })).toHaveLength(1);
    await play(SETTLE);
    expect(document.querySelector('[data-rest]')).toBeNull();
    // then it takes the free place above the cut
    expect(screen.getAllByRole('link', { name: 'Three' })).toHaveLength(1);
  });

  it('grows the row that takes a leaving row’s place, clipped while it does', async () => {
    const { rerender } = render(lane(TITLES), { wrapper });
    // nothing is clipped at rest
    expect(
      document.querySelector('[data-leaving-item].overflow-hidden'),
    ).toBeNull();
    rerender(lane(TITLES.slice(1)));
    await play(48);
    expect(itemOf('Three')?.className).toContain('overflow-hidden');
    await play(SETTLE);
    expect(itemOf('Three')?.className).not.toContain('overflow-hidden');
  });

  it('lets a row that leaves fold out of reach, then out of the page', async () => {
    const { rerender } = render(lane(TITLES), { wrapper });
    rerender(lane(TITLES.slice(1)));
    // still drawn while it leaves, but no press reaches it
    expect(itemOf('One')?.hasAttribute('inert')).toBe(true);
    await play(SETTLE);
    expect(screen.queryByRole('link', { name: 'One' })).toBeNull();
    // the next one moved up under the cut
    expect(screen.getByRole('link', { name: 'Three' })).toBeTruthy();
  });

  it('hands focus in a leaving row to the same control in the next row', () => {
    const { rerender } = render(lane(TITLES), { wrapper });
    act(() => screen.getByRole('button', { name: 'Hide One' }).focus());
    rerender(lane(TITLES.slice(1)));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Hide Two' }),
    );
  });

  it('hands focus in the last row to the lane’s heading', () => {
    const { rerender } = render(lane(['One']), { wrapper });
    act(() => screen.getByRole('button', { name: 'Keep One' }).focus());
    rerender(lane([]));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Lane' }),
    );
  });

  it('says once that the last rows have left, after both lists swept out', async () => {
    const onSettled = vi.fn();
    const { rerender } = render(lane(TITLES, { onSettled }), { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Show all 5' }));
    rerender(lane([], { onSettled, sweeping: true }));
    expect(onSettled).not.toHaveBeenCalled();
    await play(SETTLE);
    expect(document.querySelector('[data-leaving-item]')).toBeNull();
    // the list above the cut finished first: it didn't speak for the rest
    expect(onSettled).toHaveBeenCalledOnce();
    await play(SETTLE);
    expect(onSettled).toHaveBeenCalledOnce();
  });
});
