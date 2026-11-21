// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import type { ComponentProps } from 'react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { TileView } from '@/lib/profile/tileView';
import ShelfBody from './ShelfBody';
import type ShelfGrid from './ShelfGrid';

type GridProps = ComponentProps<typeof ShelfGrid>;

// The grid's exits are Motion's: the stub hands its `settled` to the test,
// which ends them when it chooses
let endExits: () => void = () => {};
vi.mock('./ShelfGrid', () => ({
  default: ({ settled, tiles }: GridProps) => {
    endExits = settled;
    return (
      <ul>
        {tiles.map((tile) => (
          <li key={tile.id}>{tile.id}</li>
        ))}
      </ul>
    );
  },
}));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(cleanup);

const tile = (id: number) => ({ id }) as TileView;
const EMPTY = <p>Nothing here yet</p>;

function body(tiles: ReadonlyArray<TileView>, settled = vi.fn()) {
  return (
    <ShelfBody
      empty={EMPTY}
      hasMore={false}
      list={0}
      listRef={{ current: null }}
      loadMore={vi.fn()}
      moving
      settled={settled}
      shelf="watchlist"
      status="idle"
      tiles={tiles}
    />
  );
}

describe('ShelfBody: the empty state waits for the last tile to leave', () => {
  it('keeps the grid while the last tile leaves, then shows the empty state', () => {
    const settled = vi.fn();
    const { rerender } = render(body([tile(1)], settled));
    rerender(body([], settled));
    expect(screen.queryByText('Nothing here yet')).toBeNull();
    expect(screen.getByRole('list')).toBeTruthy();

    act(() => endExits());
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    // the shelf's move ends with the exits
    expect(settled).toHaveBeenCalled();
  });

  it('a list that arrives with nothing shows the empty state at once', () => {
    render(body([]));
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
  });

  it('a tile coming back (an Undo) brings the grid back', () => {
    const { rerender } = render(body([tile(1)]));
    rerender(body([]));
    act(() => endExits());
    rerender(body([tile(1)]));
    expect(screen.queryByText('Nothing here yet')).toBeNull();
    expect(screen.getByText('1')).toBeTruthy();
  });
});
