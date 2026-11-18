// @vitest-environment jsdom

import { render as baseRender, screen, within } from '@testing-library/react';
import type { NewRelease, TvSeries } from '@tvseri.es/schemas';
import { type ReactElement, useLayoutEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import LeadTile from './LeadTile';
import { LEAD_WIDTH } from './layout';
import NewThisWeekRow, { NewThisWeekSkeleton } from './NewThisWeekRow';

// TileLink prefetches on intent; the arrows and Back restore read the router
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: () => {} }),
}));

// The arrows measure the rail (globals are unstubbed after each test)
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

const TMDB = 'https://image.tmdb.org/t/p';

/** The tiles' Watched labels read the viewer's library (root layout) */
const render = (ui: ReactElement) =>
  baseRender(ui, { wrapper: MarkingProvider });

function Watched({ ids }: Readonly<{ ids: ReadonlyArray<number> }>) {
  const store = useMarkingStoreApi();
  useLayoutEffect(() => {
    store.getState().setLibrary({
      ids: { favorites: [], inProgress: [], watched: ids, watchlist: [] },
      status: 'ready',
    });
  }, [store, ids]);
  return null;
}

const release = (
  id: number,
  title: string,
  fields: Partial<NewRelease> = {},
  series: Partial<TvSeries> = {},
): NewRelease => ({
  date: '2026-11-09',
  kind: 'new-series',
  rank: id,
  seasonNumber: 1,
  series: {
    backdropImage: `${TMDB}/w1280/b${id}.jpg`,
    firstAirDate: '2026-11-09',
    genres: [{ id: 10765, name: 'Sci-Fi & Fantasy', slug: 'sci-fi-fantasy' }],
    id,
    posterImage: `${TMDB}/w342/p${id}.jpg`,
    slug: title.toLowerCase().replace(/\W+/g, '-'),
    title,
    titleTreatmentImage: `${TMDB}/w500/l${id}.png`,
    ...series,
  } as TvSeries,
  ...fields,
});

const ITEMS: ReadonlyArray<NewRelease> = [
  release(1, 'Pluribus'),
  release(2, 'Silo', { kind: 'new-season', seasonNumber: 3 }),
  release(3, 'Paradise'),
  release(4, 'The Penguin'),
];

describe('LeadTile', () => {
  it('links to the show, named by its logo', () => {
    render(<LeadTile release={ITEMS[0]!} />);
    const link = screen.getByRole('link', { name: 'Pluribus' });
    expect(link.getAttribute('href')).toBe('/1/pluribus');
    expect(screen.getByRole('img', { name: 'Pluribus' })).toBeTruthy();
  });

  it('writes the title when there is no logo', () => {
    render(
      <LeadTile
        release={release(5, 'Sneaky Pete', {}, { titleTreatmentImage: '' })}
      />,
    );
    expect(screen.queryByRole('img', { name: 'Sneaky Pete' })).toBeNull();
    expect(
      within(screen.getByRole('link')).getByText('Sneaky Pete'),
    ).toBeTruthy();
  });

  it('says genre, year and rank for a new series', () => {
    render(<LeadTile release={{ ...ITEMS[0]!, rank: 2 }} />);
    expect(screen.getByText('Sci-Fi & Fantasy')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getByText('#2 this week')).toBeTruthy();
  });

  it('says the season instead of the year for a new season', () => {
    render(<LeadTile release={ITEMS[1]!} />);
    expect(screen.getByText('Season 3')).toBeTruthy();
    expect(screen.queryByText('2026')).toBeNull();
  });
});

describe('NewThisWeekRow', () => {
  it('labels the lead and the posters the viewer watched, as other rows', () => {
    render(
      <>
        <Watched ids={[1, 3]} />
        <NewThisWeekRow items={ITEMS} />
      </>,
    );
    expect(screen.getAllByText('Watched')).toHaveLength(2);
  });

  it('is a row named "New this week" with its arrows', () => {
    render(<NewThisWeekRow items={ITEMS} />);
    const region = screen.getByRole('region', { name: 'New this week' });
    expect(
      within(region).getByRole('heading', { level: 2, name: 'New this week' }),
    ).toBeTruthy();
    expect(region.getAttribute('data-slot')).toBe('new-this-week');
  });

  it('draws the lead wide and the rest as posters without a line below', () => {
    render(<NewThisWeekRow items={ITEMS} />);
    const tiles = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(tiles).toHaveLength(4);
    expect(tiles[0]!.className).toContain(LEAD_WIDTH);
    expect(tiles[0]!.textContent).toContain('#1 this week');
    for (const tile of tiles.slice(1)) {
      expect(tile.className).not.toContain(LEAD_WIDTH);
      expect(tile.textContent).toBe('');
    }
    expect(
      within(tiles[2]!)
        .getByRole('link', { name: 'Paradise' })
        .getAttribute('href'),
    ).toBe('/3/paradise');
  });

  it('draws only posters when the first has no backdrop (nothing can lead)', () => {
    render(
      <NewThisWeekRow
        items={[
          release(1, 'Pluribus', {}, { backdropImage: '' }),
          ...ITEMS.slice(1),
        ]}
      />,
    );
    const tiles = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(tiles[0]!.className).not.toContain(LEAD_WIDTH);
    expect(screen.queryByText(/^#\d+ this week$/)).toBeNull();
  });

  it('holds the row’s place while it loads: the title, a wide ghost with its line, posters', () => {
    const { container } = render(<NewThisWeekSkeleton />);
    const region = screen.getByRole('region', { name: 'New this week' });
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.getAttribute('data-placeholder')).toBe('new-this-week');
    const ghosts = [...container.querySelectorAll('span')];
    expect(ghosts.some((ghost) => ghost.className.includes(LEAD_WIDTH))).toBe(
      true,
    );
  });
});
