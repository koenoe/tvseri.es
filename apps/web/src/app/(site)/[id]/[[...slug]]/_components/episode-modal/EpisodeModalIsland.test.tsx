// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EpisodeModalIsland from './EpisodeModalIsland';

const { query } = vi.hoisted(() => ({ query: { value: '' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/456/the-simpsons',
  useSearchParams: () => new URLSearchParams(query.value),
}));
// The modal's chunk never arrives: what starts must not wait for it
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('../../_lib/ShowProvider', () => ({
  useShow: () => ({
    id: 456,
    seasons: [{ airedEpisodeCount: 22, episodeCount: 22, seasonNumber: 5 }],
    slug: 'the-simpsons',
    title: 'The Simpsons',
  }),
}));

afterEach(cleanup);

describe('EpisodeModalIsland', () => {
  it('a deep link starts the episode’s reads with the modal’s chunk, not after it', () => {
    const fetch = vi.fn((_url: string) => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetch);
    query.value = 'season=5&episode=2';

    render(<EpisodeModalIsland />);

    const urls = fetch.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual(
      expect.arrayContaining([
        '/api/series/456/season/5',
        '/api/series/456/season/5/ratings',
        '/api/series/456/season/5/episode/2',
      ]),
    );
  });

  it('starts nothing without an episode in the URL', () => {
    const fetch = vi.fn((_url: string) => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetch);
    query.value = '';

    render(<EpisodeModalIsland />);

    expect(fetch).not.toHaveBeenCalled();
  });
});
