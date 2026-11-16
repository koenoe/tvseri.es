// @vitest-environment jsdom
import type { LibraryIds } from '@tvseri.es/schemas';
import { act, type ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const TILES = Array.from({ length: 50 }, (_, index) => index + 1);

let renders = 0;

/** The page, from fresh modules: "signed in?" is cached per module */
async function loadPage(): Promise<ReactElement> {
  vi.resetModules();
  const { useLibrarySelect } = await import('./hooks');
  const { default: MarkingProvider } = await import('./MarkingProvider');

  function Tile({ id }: Readonly<{ id: number }>) {
    renders += 1;
    const isWatched = (ids: LibraryIds) => ids.watched.includes(id);
    const watched = useLibrarySelect(isWatched, false);
    return <span>{watched ? 'w' : '-'}</span>;
  }

  return (
    <MarkingProvider>
      {TILES.map((id) => (
        <Tile id={id} key={id} />
      ))}
    </MarkingProvider>
  );
}

afterEach(() => {
  document.cookie = '__tvseries_user=; Max-Age=0; Path=/';
  vi.unstubAllGlobals();
});

describe('tiles asking the library while a page hydrates', () => {
  it.each([
    ['signed in', 'nina'],
    ['signed out', null],
  ])(
    'render once each (%s) and ask for the library at most once',
    async (_, user) => {
      if (user) {
        document.cookie = `__tvseries_user=${user}; Path=/`;
      }
      const fetch = vi.fn(() => new Promise<Response>(() => {}));
      vi.stubGlobal('fetch', fetch);
      const page = await loadPage();

      const container = document.createElement('div');
      container.innerHTML = renderToString(page);
      renders = 0;
      await act(async () => {
        hydrateRoot(container, page);
      });

      expect(renders).toBe(TILES.length);
      expect(fetch).toHaveBeenCalledTimes(user ? 1 : 0);
    },
  );
});
