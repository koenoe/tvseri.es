// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import type { UpNextItem } from '@tvseri.es/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UpNextCardGhost from './UpNextCardGhost';
import UpNextFacts from './UpNextFacts';
import UpNextItemCard from './UpNextItemCard';
import { ownerFacts } from './upNextCopy';

// TileLink prefetches on intent
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: () => {} }),
}));

afterEach(cleanup);

// Thu 12 Nov 2026, 15:00 UTC
const NOW = Date.UTC(2026, 10, 12, 15);

const item: UpNextItem = {
  airDate: '2019-05-10',
  code: 'S01E02',
  episode: 2,
  episodeTitle: 'Pilot Two',
  isLatest: false,
  lastWatchedAt: NOW - 86_400_000,
  lastWatchedCode: 'S01E01',
  nextSeasonTba: false,
  nextToAir: null,
  posterImage: '',
  runtime: 33,
  season: 1,
  seasonFinale: false,
  seasonTotal: 6,
  seasonWatched: 1,
  seriesId: 7,
  slug: 'show',
  timeLeftMinutes: 149,
  title: 'The Show',
  toWatch: 5,
};

const art = {
  backdropImage: 'https://image.tmdb.org/t/p/w1280/b.jpg',
  titleTreatmentImage: 'https://image.tmdb.org/t/p/w500/l.png',
};

function renderCard(props: Partial<Parameters<typeof UpNextItemCard>[0]> = {}) {
  const facts = <UpNextFacts facts={ownerFacts(item, NOW)} />;
  return render(
    <UpNextItemCard
      art={art}
      facts={facts}
      href="/7/show?season=1&episode=2"
      item={item}
      now={NOW}
      {...props}
    />,
  );
}

describe('UpNextItemCard', () => {
  it('is one link named after the episode, with the words above it', () => {
    renderCard();
    const link = screen.getByRole('link', {
      name: 'The Show, S01E02 Pilot Two',
    });
    expect(link.getAttribute('href')).toBe('/7/show?season=1&episode=2');
    // the words are the card's, not the link's: a control can sit among them
    expect(within(link).queryByText('S01E02')).toBeNull();
    const card = screen.getByRole('article');
    expect(within(card).getByText('S01E02')).toBeTruthy();
    expect(within(card).getByText('Pilot Two')).toBeTruthy();
    expect(within(card).getByRole('img', { name: 'The Show' })).toBeTruthy();
  });

  it('draws the profile’s facts line, the pill and the progress', () => {
    const { container } = renderCard();
    const text = container.textContent ?? '';
    expect(text).toContain('Aired May 2019');
    expect(text).toContain('33m');
    expect(text).toContain('5 left · 2h 29m');
    expect(text).toContain('Last watched S01E01 yesterday');
    expect(text).toContain('1 of 6 watched · 5 to watch');
    expect(
      screen.getByRole('img', { name: '1 of 6 watched · 5 to watch' }),
    ).toBeTruthy();
  });

  it('has no controls without the actions slot', () => {
    renderCard();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('takes the actions and an episode control outside the link', () => {
    const actions = <button type="button">More</button>;
    const end = <button type="button">Mark</button>;
    renderCard({ actions, episodeEnd: end });
    // no control nested in the link: each keeps its own press and name
    const link = screen.getByRole('link');
    expect(within(link).queryAllByRole('button')).toHaveLength(0);
    // the bar lets presses through to the link; the control takes its own
    const mark = screen.getByRole('button', { name: 'Mark' });
    expect(mark.closest('.pointer-events-auto')).not.toBeNull();
  });

  it('puts the place’s tag above the pill, both at the start of the top row', () => {
    renderCard({ tag: <span>New to you</span> });
    const tag = screen.getByText('New to you');
    const start = tag.parentElement;
    expect(start?.textContent?.indexOf('New to you')).toBeLessThan(
      start?.textContent?.indexOf('Last watched') ?? -1,
    );
  });

  it('writes the title when the show has no title treatment', () => {
    renderCard({ art: null });
    expect(screen.queryByRole('img', { name: 'The Show' })).toBeNull();
    expect(screen.getByText('The Show')).toBeTruthy();
  });

  it('leaves the pill out without a last watched episode', () => {
    const { container } = renderCard({
      item: { ...item, lastWatchedAt: null, lastWatchedCode: null },
    });
    expect(container.textContent).not.toContain('Last watched');
  });
});

describe('UpNextCardGhost', () => {
  it('marks itself as the card’s placeholder and fills the same slots', () => {
    const actions = <span data-testid="ghost-action" />;
    const { container } = render(<UpNextCardGhost actions={actions} />);
    expect(
      container.querySelector('[data-placeholder="up-next-card"]'),
    ).not.toBeNull();
    expect(screen.getByTestId('ghost-action')).toBeTruthy();
    // the ghost carries the fill only: the placeholder around it pulses
    expect(container.querySelector('.animate-ghost')).toBeNull();
  });
});
