// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import type { UpNextItem } from '@tvseri.es/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';

import ContinueWatching from './ContinueWatching';

const { culmination, live } = vi.hoisted(() => ({
  culmination: vi.fn<(seriesId: number) => number | null>(() => null),
  live: vi.fn<(items: ReadonlyArray<UpNextItem>) => ReadonlyArray<UpNextItem>>(
    (items) => items,
  ),
}));
vi.mock('@/lib/marking/useCulmination', () => ({
  default: (seriesId: number) => culmination(seriesId),
}));
vi.mock(import('@/lib/marking/hooks'), async (importOriginal) => ({
  ...(await importOriginal()),
  useLiveUpNext: (items: ReadonlyArray<UpNextItem>) => live(items),
}));
// TileLink prefetches on intent
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: () => {} }),
}));

// Thu 12 Nov 2026, 15:00 UTC
const NOW = Date.UTC(2026, 10, 12, 15);

const show = (seriesId: number, title: string): UpNextItem => ({
  airDate: '2019-05-10',
  code: 'S01E06',
  episode: 6,
  episodeTitle: 'Finale',
  isLatest: false,
  lastWatchedAt: NOW - 86_400_000,
  lastWatchedCode: 'S01E05',
  nextSeasonTba: false,
  nextToAir: null,
  posterImage: '',
  runtime: 33,
  season: 1,
  seasonFinale: true,
  seasonTotal: 6,
  seasonWatched: 5,
  seriesId,
  slug: title.toLowerCase().replaceAll(' ', '-'),
  timeLeftMinutes: 33,
  title,
  toWatch: 1,
});

const bear = show(1, 'The Bear');
const dark = show(2, 'Dark');
const silo = show(3, 'Silo');

const row = (items: ReadonlyArray<UpNextItem>) => (
  <MarkingProvider>
    <ContinueWatching
      count={items.length}
      first={null}
      items={items}
      now={NOW}
      username="nina"
    />
  </MarkingProvider>
);

const lane = () => screen.getByRole('region', { name: /In progress/ });

describe('Continue watching after your mark finishes the show on the tile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    culmination.mockReturnValue(null);
    live.mockImplementation((items) => items);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('holds the finished show a beat, the next one staying in the lane until it takes the tile', () => {
    const { rerender } = render(row([bear, dark, silo]));
    culmination.mockImplementation((id) => (id === 1 ? 5 : null));
    live.mockImplementation(() => [dark, silo]);
    rerender(row([bear, dark, silo]));

    expect(within(lane()).queryByText('The Bear')).toBe(null);
    expect(within(lane()).getByText('Dark')).toBeTruthy();

    act(() => vi.advanceTimersByTime(500));
    expect(within(lane()).queryByText('Dark')).toBe(null);
    expect(within(lane()).getByText('Silo')).toBeTruthy();
  });
});
