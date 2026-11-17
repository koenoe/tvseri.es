// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StartPick } from '../data/whereToStart';
import WhereToStart from './WhereToStart';

// TileLink prefetches on intent through the app router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));

vi.mock('./SeenNote', () => ({ default: () => null }));
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
  it('every pick is a card everywhere, no swipe row', () => {
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
