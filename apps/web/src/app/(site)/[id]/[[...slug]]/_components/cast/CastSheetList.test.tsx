// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CastSheetList from './CastSheetList';

let showId = 0;
vi.mock('../../_lib/ShowProvider', () => ({
  useShow: () => ({ id: showId, title: 'The Bear' }),
}));

const STORER = {
  id: 1,
  image: 'https://image.tmdb.org/1.jpg',
  name: 'Christopher Storer',
  role: 'Creator',
  slug: 'christopher-storer',
};

const WHITE = {
  id: 2,
  image: '',
  name: 'Jeremy Allen White',
  role: 'Carmy Berzatto',
  slug: 'jeremy-allen-white',
};

const CALO = {
  id: 3,
  image: '',
  name: 'Joanna Calo',
  role: 'Director · 3 episodes',
  slug: 'joanna-calo',
};

const RUSSO = {
  id: 4,
  image: '',
  name: 'Jeff Russo',
  role: 'Original Music Composer · 28 episodes',
  slug: 'jeff-russo',
};

const PEOPLE = {
  cast: [WHITE],
  crew: [
    { people: [STORER], title: 'Created by' },
    { people: [CALO], title: 'Directed by' },
    { people: [RUSSO], title: 'Music by' },
  ],
};

const answer = (body: unknown, ok = true) =>
  vi.fn(async () => ({ json: async () => body, ok, status: ok ? 200 : 502 }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CastSheetList', () => {
  it('shows the rows’ skeleton, then everyone linking to their pages', async () => {
    showId = 101;
    const fetch = answer(PEOPLE);
    vi.stubGlobal('fetch', fetch);
    const { container } = render(<CastSheetList total={2} />);

    expect(
      container.querySelector('[data-placeholder="cast-sheet"]'),
    ).toBeTruthy();
    const creator = await screen.findByRole('link', {
      name: 'Christopher Storer, creator',
    });
    expect(creator.getAttribute('href')).toBe('/person/1/christopher-storer');
    expect(
      screen.getByRole('link', {
        name: 'Jeremy Allen White as Carmy Berzatto',
      }),
    ).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('/api/series/101/credits', undefined);
  });

  it('lists the cast, then each crew section in order, under its heading', async () => {
    showId = 103;
    vi.stubGlobal('fetch', answer(PEOPLE));
    render(<CastSheetList total={4} />);

    await screen.findByRole('region', { name: 'Cast' });
    const regions = screen.getAllByRole('region');
    expect(
      regions.map((region) => region.querySelector('h3')?.textContent),
    ).toEqual(['Cast', 'Created by', 'Directed by', 'Music by']);
    expect(regions[0]?.textContent).toContain('Jeremy Allen White');
    expect(regions[0]?.textContent).not.toContain('Christopher Storer');
    expect(regions[2]?.textContent).toContain('Director · 3 episodes');
  });

  it('names a crew row by its jobs, and keeps one without a photo', async () => {
    showId = 105;
    vi.stubGlobal('fetch', answer(PEOPLE));
    render(<CastSheetList total={4} />);

    const calo = await screen.findByRole('link', {
      name: 'Joanna Calo, Director · 3 episodes',
    });
    expect(calo.getAttribute('href')).toBe('/person/3/joanna-calo');
    expect(calo.querySelector('img')).toBeNull();
  });

  it('has no crew sections without a crew', async () => {
    showId = 104;
    vi.stubGlobal('fetch', answer({ cast: [WHITE], crew: [] }));
    render(<CastSheetList total={1} />);

    expect(await screen.findByRole('region', { name: 'Cast' })).toBeTruthy();
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.queryByText('Created by')).toBeNull();
  });

  it('shows a long section’s first 100, then everyone with Show all', async () => {
    showId = 106;
    const cast = Array.from({ length: 2622 }, (_, index) => ({
      ...WHITE,
      id: 1000 + index,
      name: `Actor ${index}`,
    }));
    vi.stubGlobal('fetch', answer({ cast, crew: [] }));
    render(<CastSheetList total={2622} />);

    const section = await screen.findByRole('region', { name: 'Cast' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(100);
    const showAll = within(section).getByRole('button', {
      name: 'Show all 2,622',
    });
    expect(showAll.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(showAll);
    expect(
      await within(section).findByRole('button', { expanded: true }),
    ).toBeTruthy();
    expect(within(section).getAllByRole('listitem')).toHaveLength(2622);
  });

  it('says the list didn’t load, and Try again loads it', async () => {
    showId = 102;
    vi.stubGlobal('fetch', answer(null, false));
    render(<CastSheetList total={2} />);

    const retry = await screen.findByRole('button', { name: /Try again/ });
    expect(screen.getByText('The cast and crew didn’t load.')).toBeTruthy();

    vi.stubGlobal('fetch', answer(PEOPLE));
    retry.click();
    expect(
      await screen.findByRole('link', { name: 'Christopher Storer, creator' }),
    ).toBeTruthy();
  });
});
