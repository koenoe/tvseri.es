// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCookie } from '@/test/setCookie';
import { useNewToViewer } from './hooks';
import MarkingProvider from './MarkingProvider';

const SHOWS = [1, 2, 3, 4].map((id) => ({ id }));

function Ids() {
  const shows = useNewToViewer(SHOWS);
  return (
    <span data-testid="ids">{shows.map((show) => show.id).join(',')}</span>
  );
}

afterEach(() => {
  setCookie('__tvseries_user=; Max-Age=0; Path=/');
  vi.unstubAllGlobals();
});

describe('useNewToViewer: "start something new" offers nothing you have', () => {
  it('all until the library is known, then only the series in none of its lists', async () => {
    setCookie('__tvseries_user=nina; Path=/');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              favorites: [],
              inProgress: [2],
              watched: [3],
              watchlist: [],
            }),
          ),
        ),
      ),
    );
    render(
      <MarkingProvider>
        <Ids />
      </MarkingProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('ids').textContent).toBe('1,4'),
    );
  });

  it('signed out: everything', () => {
    render(
      <MarkingProvider>
        <Ids />
      </MarkingProvider>,
    );
    expect(screen.getByTestId('ids').textContent).toBe('1,2,3,4');
  });
});
