// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PosterLink from './PosterLink';
import PosterTile from './PosterTile';
import WatchedLabel from './WatchedLabel';

// TileLink prefetches on intent through the app router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));

const POSTER =
  'https://image.tmdb.org/t/p/w300_and_h450_bestv2/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg';

describe('PosterTile', () => {
  it('links to the show page, named by the show', () => {
    render(
      <PosterTile
        id={1396}
        poster={POSTER}
        slug="breaking-bad"
        title="Breaking Bad"
      />,
    );
    const link = screen.getByRole('link', { name: 'Breaking Bad' });
    expect(link.getAttribute('href')).toBe('/1396/breaking-bad');
  });

  it('grows 4% on hover, the one tile hover, and shrinks when pressed on touch', () => {
    render(<PosterTile id={1} poster={POSTER} slug="a" title="A" />);
    const link = screen.getByRole('link', { name: 'A' });
    expect(link.className).toContain('hover:scale-104');
    expect(link.className).toContain('duration-250');
    expect(link.className).toContain('pointer-coarse:active:scale-98');
    expect(link.className).not.toContain('translate-y');
  });

  it('takes a fuller name when an overlay or caption adds state', () => {
    render(
      <PosterTile
        id={95396}
        label="Severance, watched"
        overlay={<WatchedLabel />}
        poster={POSTER}
        slug="severance"
        title="Severance"
      >
        <span>Apple TV, like Severance</span>
      </PosterTile>,
    );
    expect(
      screen.getByRole('link', { name: 'Severance, watched' }),
    ).toBeTruthy();
    expect(screen.getByText('Watched')).toBeTruthy();
    expect(screen.getByText('Apple TV, like Severance')).toBeTruthy();
  });

  it('names the link by the poster and its overlay when no label is given', () => {
    // e.g. the Watched label rendered by a client island inside a cached row
    render(
      <PosterTile
        id={95396}
        overlay={<WatchedLabel />}
        poster={POSTER}
        slug="severance"
        title="Severance"
      />,
    );
    expect(
      screen.getByRole('link', { name: 'Severance Watched' }),
    ).toBeTruthy();
  });

  it('shows the title on a placeholder when the show has no poster', () => {
    const { container } = render(
      <PosterTile id={1} poster={null} title="A Show Without Art" />,
    );
    expect(
      screen.getByRole('link', { name: 'A Show Without Art' }),
    ).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('A Show Without Art')).toBeTruthy();
  });
});

describe('PosterLink', () => {
  it('links the poster in the place’s look, named by its label', () => {
    render(
      <PosterLink
        href="/1/severance"
        label="Severance, S01E02"
        look={{ link: 'place-link' }}
        poster={null}
        sizes="160px"
        title="Severance"
      />,
    );

    const link = screen.getByRole('link', { name: 'Severance, S01E02' });
    expect(link.className).toBe('place-link');
    expect(link.getAttribute('href')).toBe('/1/severance');
    expect(link.textContent).toBe('Severance');
  });
});
