// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GHOST_FILL } from '@/components/ui/row/RowGhosts';

import LandingRow from './LandingRow';
import LandingShowCount from './LandingShowCount';
import {
  LandingHeroDetailsSkeleton,
  RankedListSkeleton,
  SpotlightSkeleton,
  WhereToStartSkeleton,
} from './skeletons';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('../data/landingCount', () => ({
  getLandingCount: async () => ({ unavailable: true }),
}));

const UNAVAILABLE = { unavailable: true } as const;

const fills = (container: HTMLElement) =>
  container.querySelectorAll(`[class*="${GHOST_FILL}"]`);

describe('a landing section whose data is Unavailable', () => {
  it('a poster row draws the failed row, settled, with Try again', async () => {
    const row = await LandingRow({
      id: 'trend',
      index: 0,
      loaders: [async () => UNAVAILABLE],
      subtitle: 'Most watched this week',
      title: 'Trending in Crime',
    });
    render(row);
    const region = screen.getByRole('region', { name: 'Trending in Crime' });
    expect(region.getAttribute('aria-busy')).not.toBe('true');
    expect(region.textContent).toContain('Trending in Crime didn’t load.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('the hero’s count draws a dashed outline, not the loading fill', async () => {
    const count = await LandingShowCount({ slug: 'crime', type: 'genre' });
    const { container } = render(count);
    expect(fills(container)).toHaveLength(0);
    expect(container.querySelector('.border-dashed')).not.toBeNull();
  });
});

describe('section placeholders', () => {
  it.each([
    ['Where to start', <WhereToStartSkeleton key="w" look="failed" />],
    [
      'The 50 best',
      <RankedListSkeleton key="r" look="failed" title="The 50 best" />,
    ],
  ])('%s failed: the card over dashed slots, not busy', (title, element) => {
    const { container } = render(element);
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(container.textContent).toContain(`${title} didn’t load.`);
    expect(fills(container)).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it.each([
    ['Where to start', <WhereToStartSkeleton key="w" />],
    ['The 50 best', <RankedListSkeleton key="r" title="The 50 best" />],
  ])('%s loading (a Suspense fallback): busy, no card', (_, element) => {
    const { container } = render(element);
    expect(container.querySelector('section')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(container.textContent).not.toContain('didn’t load');
  });

  it('the hero details failed: dashed outlines; the tile too, under the card', () => {
    const { container } = render(
      <>
        <LandingHeroDetailsSkeleton facts={4} line look="failed" />
        <SpotlightSkeleton look="failed" />
      </>,
    );
    expect(fills(container)).toHaveLength(0);
    expect(container.querySelectorAll('.border-dashed').length).toBeGreaterThan(
      4,
    );
    // a tile with nothing in it would read as blank: it says what failed
    expect(container.textContent).toContain('The recommendation didn’t load.');
  });
});
