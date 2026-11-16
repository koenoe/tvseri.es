// @vitest-environment jsdom
import type { LibraryIds } from '@tvseri.es/schemas';
import { act, type ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCookie } from '@/test/setCookie';
import type { MarkingStoreApi } from './store';

const IDS: LibraryIds = {
  favorites: [],
  inProgress: [],
  watched: [1],
  watchlist: [],
};

let renders = 0;
let store: MarkingStoreApi | null = null;

/** A deck that keeps the shows the viewer hasn't watched, from fresh modules */
async function loadDeck(): Promise<ReactElement> {
  vi.resetModules();
  const { useLibraryOnce } = await import('./hooks');
  const { default: MarkingProvider, useMarkingStoreApi } = await import(
    './MarkingProvider'
  );

  function Deck() {
    renders += 1;
    store = useMarkingStoreApi();
    const { status, taken } = useLibraryOnce((ids) =>
      [1, 2, 3].filter((id) => !ids.watched.includes(id)),
    );
    return (
      <span>
        {status}:{taken ? taken.join(',') : 'all'}
      </span>
    );
  }

  return (
    <MarkingProvider>
      <Deck />
    </MarkingProvider>
  );
}

afterEach(() => {
  setCookie('__tvseries_user=; Max-Age=0; Path=/');
  vi.unstubAllGlobals();
  store = null;
});

describe('useLibraryOnce', () => {
  it('hydrates as idle, takes the answer once the ids arrive, and keeps it through later marks', async () => {
    setCookie('__tvseries_user=nina; Path=/');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(IDS), {
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    );
    const deck = await loadDeck();
    const container = document.createElement('div');
    container.innerHTML = renderToString(deck);
    expect(container.textContent).toBe('idle:all');

    await act(async () => {
      hydrateRoot(container, deck);
    });
    await vi.waitFor(() => expect(container.textContent).toBe('ready:2,3'));

    renders = 0;
    await act(async () => {
      store
        ?.getState()
        .updateLibraryIds((ids) => ({ ...ids, watched: [1, 2] }));
    });
    expect(container.textContent).toBe('ready:2,3');
    expect(renders).toBe(0);
  });

  it('takes nothing signed out', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const deck = await loadDeck();
    const container = document.createElement('div');
    container.innerHTML = renderToString(deck);

    await act(async () => {
      hydrateRoot(container, deck);
    });

    expect(container.textContent).toBe('signed-out:all');
    expect(fetch).not.toHaveBeenCalled();
  });
});
