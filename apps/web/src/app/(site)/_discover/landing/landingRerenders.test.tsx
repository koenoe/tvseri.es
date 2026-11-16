// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, Profiler, useLayoutEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStoreApi } from '@/lib/marking/store';

import LandingShowRow from './LandingShowRow';
import { LandingSwitchProvider } from './LandingSwitch';
import { neverRepeat } from './neverRepeat';
import type { RowShow } from './types';

// TileLink prefetches on intent through the app router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));

/** The rows whose `LandingShowRow` rendered (each draws one `Row`) */
const rowRenders = vi.hoisted(() => new Set<string>());
vi.mock('@/components/ui/row/Row', async (importActual) => {
  const actual = await importActual<typeof import('@/components/ui/row/Row')>();
  const Row = actual.default;
  return {
    ...actual,
    default: (props: ComponentProps<typeof Row>) => {
      rowRenders.add(props.id);
      return <Row {...props} />;
    },
  };
});

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  Element.prototype.scrollTo ??= () => {};
});

const shows = (from: number, to: number): ReadonlyArray<RowShow> =>
  Array.from({ length: to - from + 1 }, (_, index) => {
    const id = from + index;
    return { id, poster: null, slug: `show-${id}`, title: `Show ${id}` };
  });

/**
 * Three rows top to bottom: "above" (no switch), "kind" (a switch), and
 * "below", which shares shows with both of the switch's tabs.
 */
const [above, kind, below] = neverRepeat(
  [
    { kind: 'shows', shows: shows(1, 5) },
    {
      kind: 'tabs',
      switchId: 'kind',
      tabs: { a: shows(6, 10), b: shows(11, 15) },
    },
    { kind: 'shows', shows: shows(6, 20) },
  ],
  20,
  3,
);

let api: MarkingStoreApi | null = null;
function Grab() {
  const store = useMarkingStoreApi();
  useLayoutEffect(() => {
    api = store;
  }, [store]);
  return null;
}

/** Anything inside a row rendered (its tiles' Watched labels too) */
const anyRenders = new Set<string>();
const onRender = (id: string) => anyRenders.add(id);

function setup() {
  if (!above || !kind || !below) {
    throw new Error('no plan');
  }
  const tabs = [
    { key: 'a', label: 'Tab A' },
    { key: 'b', label: 'Tab B' },
  ];
  render(
    <MarkingProvider>
      <Grab />
      <LandingSwitchProvider>
        <Profiler id="above" onRender={onRender}>
          <LandingShowRow id="above" plan={above} title="Above" />
        </Profiler>
        <Profiler id="kind" onRender={onRender}>
          <LandingShowRow
            id="kind"
            plan={kind}
            switchLabel="Kind"
            tabs={tabs}
            title="By kind"
          />
        </Profiler>
        <Profiler id="below" onRender={onRender}>
          <LandingShowRow id="below" plan={below} title="Below" />
        </Profiler>
      </LandingSwitchProvider>
    </MarkingProvider>,
  );
  const store = api as MarkingStoreApi;
  act(() => {
    store.getState().setLibrary({
      ids: { favorites: [], inProgress: [], watched: [], watchlist: [] },
      status: 'ready',
    });
  });
  rowRenders.clear();
  anyRenders.clear();
  return store;
}

const linksIn = (row: string) =>
  Array.from(
    document.querySelectorAll(`#${row}-rail a`),
    (link) => link.getAttribute('href') ?? '',
  );

describe('a landing re-renders only what a press or a mark changes', () => {
  it('a switch press re-renders its own row and the row below, not the row above', () => {
    setup();
    expect(linksIn('below')).not.toContain('/6/show-6');
    // the switch is drawn twice (beside the title, and on its own phone line)
    const [tabB] = screen.getAllByRole('button', { name: 'Tab B' });
    if (!tabB) {
      throw new Error('no Tab B');
    }
    fireEvent.click(tabB);
    expect([...rowRenders].sort()).toEqual(['below', 'kind']);
    // the row below now draws tab A's shows and drops tab B's
    expect(linksIn('below')).toContain('/6/show-6');
    expect(linksIn('below')).not.toContain('/11/show-11');
  });

  it('a mark re-renders no row, only what is inside the row that draws the show', () => {
    const store = setup();
    act(() => {
      store.getState().setLibrary({
        ids: { favorites: [], inProgress: [], watched: [2], watchlist: [] },
        status: 'ready',
      });
    });
    expect([...rowRenders]).toEqual([]);
    expect([...anyRenders]).toEqual(['above']);
  });
});
