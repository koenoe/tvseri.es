// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TimelineRow } from './model';
import TimelineBoard from './TimelineBoard';

// Motion's full features are in (the board loads them before it opens)
vi.mock('@/components/motion/useMaxFeatures', async () => {
  const { domMax } = await import('motion/react');
  return {
    default: () => domMax,
    isMaxLoaded: () => true,
    loadMax: () => Promise.resolve(domMax),
    NOT_YET: () => new Promise<never>(() => {}),
  };
});

/** The screen: wide (desktop) or a phone */
const screenIs = (wide: boolean) => {
  window.matchMedia = ((query: string) => ({
    addEventListener: () => {},
    matches: wide && query.includes('>='),
    media: query,
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  // the phone's quarters scroll a strip jsdom doesn't lay out
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

const row = (rank: number): TimelineRow => ({
  end: 3,
  hours: '2h',
  id: rank + 1,
  label: `Show ${rank + 1}`,
  live: false,
  months: 'Jan',
  rank,
  start: 1,
  title: `Show ${rank + 1}`,
  weeks: [1, 2],
});

const ROWS = Array.from({ length: 22 }, (_, rank) => row(rank));

const board = () => (
  <TimelineBoard
    moreEpisodes={4}
    moreShows={2}
    opening={0}
    rows={ROWS}
    total={22}
    year={2025}
  />
);

/** A row past the top 20, and the box it opens in */
const rest = () => screen.getByRole('img', { name: 'Show 22' });

describe('TimelineBoard', () => {
  it('folds the rest of the series in on a wide screen', async () => {
    screenIs(true);
    render(board());
    expect(screen.queryByRole('img', { name: 'Show 22' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'All 22 series' }));
    await vi.waitFor(() =>
      expect(rest().parentElement?.className).toContain('overflow-hidden'),
    );
  });

  it('shows the rest at once on a phone, as its CSS-hidden rows do', async () => {
    screenIs(false);
    render(board());

    fireEvent.click(screen.getByRole('button', { name: 'All 22' }));
    await vi.waitFor(() => expect(rest()).toBeTruthy());
    expect(rest().parentElement?.className).not.toContain('overflow-hidden');
    expect(rest().parentElement?.style.opacity).not.toBe('0');
  });

  it('on a phone, Top 20 takes the rest away at once', async () => {
    screenIs(false);
    render(board());
    fireEvent.click(screen.getByRole('button', { name: 'All 22' }));
    await vi.waitFor(() => expect(rest()).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Top 20' }));
    await vi.waitFor(() =>
      expect(screen.queryByRole('img', { name: 'Show 22' })).toBeNull(),
    );
  });
});
