// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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

const PEOPLE = { cast: [WHITE], crew: [STORER] };

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

  it('lists the cast, then the crew, each under its heading', async () => {
    showId = 103;
    vi.stubGlobal('fetch', answer(PEOPLE));
    render(<CastSheetList total={2} />);

    const cast = await screen.findByRole('region', { name: 'Cast' });
    const crew = screen.getByRole('region', { name: 'Crew' });
    expect(cast.textContent).toContain('Jeremy Allen White');
    expect(cast.textContent).not.toContain('Christopher Storer');
    expect(crew.textContent).toContain('Christopher Storer');
    expect(
      cast.compareDocumentPosition(crew) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('has no Crew section without creators', async () => {
    showId = 104;
    vi.stubGlobal('fetch', answer({ cast: [WHITE], crew: [] }));
    render(<CastSheetList total={1} />);

    expect(await screen.findByRole('region', { name: 'Cast' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Crew' })).toBeNull();
    expect(screen.queryByText('Crew')).toBeNull();
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
