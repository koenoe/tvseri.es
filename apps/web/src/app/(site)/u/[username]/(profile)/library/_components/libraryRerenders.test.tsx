// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { Profiler, type ReactNode, useCallback, useLayoutEffect } from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStoreApi } from '@/lib/marking/store';
import { VisitorOverlay } from './TileOverlays';

/**
 * One mark re-renders the tiles whose answer changed, not every
 * tile that reads the viewer's library. A Library of 300 tiles (a visitor's
 * relation pills) and a row of 300 Watched labels; each tile sits in its
 * own Profiler, which reports when anything in it renders.
 */
const TILES = 300;
const ids = Array.from({ length: TILES }, (_, index) => index + 1);

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

let api: MarkingStoreApi | null = null;
function Grab() {
  const store = useMarkingStoreApi();
  useLayoutEffect(() => {
    api = store;
  }, [store]);
  return null;
}

function Counted({
  children,
  id,
  rendered,
}: Readonly<{ children: ReactNode; id: string; rendered: Set<string> }>) {
  const onRender = useCallback(() => {
    rendered.add(id);
  }, [id, rendered]);
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

function counted(rendered: Set<string>, id: string, node: ReactNode) {
  return (
    <Counted id={id} key={id} rendered={rendered}>
      {node}
    </Counted>
  );
}

function setup(tile: (id: number) => ReactNode) {
  const rendered = new Set<string>();
  render(
    <MarkingProvider>
      <Grab />
      {ids.map((id) => counted(rendered, String(id), tile(id)))}
    </MarkingProvider>,
  );
  const store = api as MarkingStoreApi;
  act(() => {
    store.getState().setLibrary({
      ids: {
        favorites: [],
        inProgress: [2],
        watched: ids.filter((id) => id % 3 === 0),
        watchlist: [5],
      },
      status: 'ready',
    });
  });
  return { rendered, store };
}

/** One mark: show 7 joins the watched list */
function markSeven(store: MarkingStoreApi) {
  const library = store.getState().library;
  if (library.status !== 'ready') {
    throw new Error('library not ready');
  }
  const start = performance.now();
  act(() => {
    store.getState().setLibrary({
      ids: { ...library.ids, watched: [...library.ids.watched, 7] },
      status: 'ready',
    });
  });
  return Math.round(performance.now() - start);
}

describe('a mark re-renders only the tiles it changes', () => {
  it('Watched labels: one of 300', () => {
    const { rendered, store } = setup((id) => <WatchedOverlay id={id} />);
    rendered.clear();
    const ms = markSeven(store);
    console.info(
      `[rerenders] WatchedOverlay: ${rendered.size} of ${TILES} (${ms}ms, jsdom, dev React)`,
    );
    expect([...rendered]).toEqual(['7']);
  });

  it('a visitor’s Library tiles (relation pills and +): one of 300', () => {
    const { rendered, store } = setup((id) => (
      <VisitorOverlay favourite={false} id={id} title={`Series ${id}`} />
    ));
    rendered.clear();
    const ms = markSeven(store);
    console.info(
      `[rerenders] VisitorOverlay: ${rendered.size} of ${TILES} (${ms}ms, jsdom, dev React)`,
    );
    expect([...rendered]).toEqual(['7']);
  });
});
