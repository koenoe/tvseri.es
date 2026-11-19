// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import StartDeck from './StartDeck';
import type { StartCard } from './startCards';

// TileLink prefetches on intent through the app router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));

const card = (id: number, slug: string, title: string): StartCard => ({
  id,
  poster: `https://image.tmdb.org/t/p/w300/${slug}.jpg`,
  provider: { logo: 'https://image.tmdb.org/t/p/w92/hbo.png', name: 'HBO' },
  seasons: '1 season out',
  slug,
  status: 'Returning',
  title,
});

const CARDS = [
  card(95396, 'severance', 'Severance'),
  card(136315, 'the-bear', 'The Bear'),
  card(1396, 'breaking-bad', 'Breaking Bad'),
];

const hrefs = (name: string) =>
  screen
    .getAllByRole('link', { name })
    .map((link) => link.getAttribute('href'));

afterEach(cleanup);

describe('StartDeck', () => {
  it('links the current pick’s poster and title to its show page, named by the title', () => {
    render(<StartDeck badge={null} cards={CARDS} mode="pick" />);
    expect(hrefs('Severance')).toEqual([
      '/95396/severance',
      '/95396/severance',
    ]);
    // the fanned cards behind are not links
    expect(screen.queryByRole('link', { name: 'The Bear' })).toBeNull();
  });

  it('moves the links to the next pick after Not now', () => {
    render(<StartDeck badge={null} cards={CARDS} mode="pick" />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(hrefs('The Bear')).toEqual(['/136315/the-bear', '/136315/the-bear']);
    expect(screen.queryByRole('link', { name: 'Severance' })).toBeNull();
  });
});
