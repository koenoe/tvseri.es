// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StartPick } from '../data/whereToStart';
import WhereToStart from './WhereToStart';

// TileLink prefetches on intent through the app router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));

vi.mock('./WhereToStartMarks', () => ({ StartSeenNote: () => null }));
vi.mock('@/components/ui/tile/WatchedOverlay', () => ({
  default: () => null,
}));

const pick = (
  id: number,
  kind: StartPick['kind'],
  title: string,
): StartPick => ({
  backup: false,
  episodes: 6,
  id,
  kind,
  network: 'BBC One',
  poster: null,
  seasons: 1,
  slug: title.toLowerCase(),
  title,
  totalMinutes: 360,
  why: 'Six episodes.',
  year: 2013,
});

const PICKS = [
  pick(1, 'favourite', 'Peaky Blinders'),
  pick(2, 'weekend', 'Fleabag'),
  pick(3, 'long-haul', 'Black Mirror'),
];

describe('WhereToStart on a phone', () => {
  it('first-card: only the first pick is a card on a phone, the rest a swipe row', () => {
    render(
      <WhereToStart id="country-start" phone="first-card" picks={PICKS} />,
    );
    const [cards, swipe] = screen.getAllByRole('list');
    const items = within(cards as HTMLElement).getAllByRole('listitem');
    // the cards stack one column below lg (the three-across row is too
    // narrow for them), so the phone's rule holds until lg
    expect(items[0]?.className ?? '').not.toContain('max-lg:hidden');
    expect(items[1]?.className).toContain('max-lg:hidden');
    expect(items[2]?.className).toContain('max-lg:hidden');
    expect(swipe?.className).toContain('lg:hidden');
    const posters = within(swipe as HTMLElement).getAllByRole('link');
    expect(posters.map((link) => link.getAttribute('aria-label'))).toEqual([
      'A weekend: Fleabag',
      'The long haul: Black Mirror',
    ]);
  });

  it('cards (the default): every pick a card everywhere, no swipe row', () => {
    render(<WhereToStart id="start" picks={PICKS} />);
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });
});

describe('WhereToStart under three picks', () => {
  it('steps aside with two picks', () => {
    const { container } = render(
      <WhereToStart id="start" picks={PICKS.slice(0, 2)} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
