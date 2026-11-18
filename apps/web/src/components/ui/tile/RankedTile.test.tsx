// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import Row from '@/components/ui/row/Row';

import RankedTile from './RankedTile';
import WatchedLabel from './WatchedLabel';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));

const POSTER =
  'https://image.tmdb.org/t/p/w300_and_h450_bestv2/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg';

const shows = Array.from({ length: 20 }, (_, index) => ({
  id: 100 + index,
  rank: index + 1,
  slug: `show-${index + 1}`,
  title: `Show ${index + 1}`,
}));

describe('RankedTile', () => {
  it('names the link by rank and title, and links to the show', () => {
    render(
      <RankedTile
        id={1396}
        poster={POSTER}
        rank={1}
        slug="breaking-bad"
        title="Breaking Bad"
      />,
    );
    const link = screen.getByRole('link', { name: '1. Breaking Bad' });
    expect(link.getAttribute('href')).toBe('/1396/breaking-bad');
  });

  it('keeps the overlay’s state after the rank and title', () => {
    render(
      <RankedTile
        id={95396}
        overlay={<WatchedLabel />}
        poster={POSTER}
        rank={12}
        slug="severance"
        title="Severance"
      />,
    );
    expect(
      screen.getByRole('link', { name: /^12\. Severance Watched$/ }),
    ).toBeTruthy();
  });

  it('draws the numeral for the eye only, never under the pointer', () => {
    const { container } = render(
      <RankedTile id={1} poster={POSTER} rank={10} slug="a" title="A" />,
    );
    const numeral = container.querySelector('[aria-hidden="true"]')!;
    expect(numeral.textContent).toBe('10');
    expect(numeral.className).toContain('pointer-events-none');
    // no caption: the title is on the poster art
    expect(container.textContent).toBe('10');
  });
});

describe('a numbered row', () => {
  it('is an ordered list of twenty ranked tiles (server markup)', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      <Row id="all-time" tiles="ranked" title="All-time favourites">
        {shows.map((show) => (
          <RankedTile key={show.id} poster={POSTER} {...show} />
        ))}
      </Row>,
    );
    const list = container.querySelector('ol')!;
    expect(list.getAttribute('role')).toBe('list');
    expect(list.children).toHaveLength(20);
    const view = within(container);
    expect(view.getAllByRole('link')).toHaveLength(20);
    expect(view.getByRole('link', { name: '20. Show 20' })).toBeTruthy();
  });
});
