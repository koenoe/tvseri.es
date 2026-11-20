// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { useCallback, useState } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import ExitGrid from './ExitGrid';

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(cleanup);

type Item = Readonly<{ id: number; name: string }>;
const ITEMS: ReadonlyArray<Item> = [
  { id: 1, name: 'Netflix' },
  { id: 2, name: 'Disney+' },
  { id: 3, name: 'Max' },
];
const keyOf = (item: Item) => item.id;
function AddButton({
  item,
  leave,
}: Readonly<{ item: Item; leave: (item: Item) => void }>) {
  const press = useCallback(() => leave(item), [item, leave]);
  return (
    <button onClick={press} type="button">
      Add {item.name}
    </button>
  );
}
const renderItem = (item: Item, leave: (item: Item) => void) => (
  <AddButton item={item} leave={leave} />
);
const EMPTY = <p>No service matches</p>;

let narrow: (items: ReadonlyArray<Item>) => void = () => {};
/** A grid whose press takes the item out, as Popular's Add does */
function Grid() {
  const [items, setItems] = useState(ITEMS);
  narrow = (next) => act(() => setItems(next));
  const take = useCallback(
    (item: Item) =>
      setItems((was) => was.filter((each) => each.id !== item.id)),
    [],
  );
  return (
    <section aria-label="Popular">
      <input aria-label="Filter services" />
      <ExitGrid
        className="grid"
        empty={EMPTY}
        items={items}
        keyOf={keyOf}
        onLeave={take}
        renderItem={renderItem}
      />
    </section>
  );
}

const button = (name: string) => screen.getByRole('button', { name });

describe('ExitGrid', () => {
  it('a pressed item leaves and focus moves to the one after it', async () => {
    render(<Grid />);
    await userEvent.click(button('Add Disney+'));
    expect(document.activeElement).toBe(button('Add Max'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Add Disney+' })).toBeNull(),
    );
  });

  it('the last one pressed hands focus back to the one before it', async () => {
    render(<Grid />);
    await userEvent.click(button('Add Max'));
    expect(document.activeElement).toBe(button('Add Disney+'));
  });

  it('shows `empty` once the last item has gone', async () => {
    render(<Grid />);
    narrow([ITEMS[0] as Item]);
    expect(screen.queryByText('No service matches')).toBeNull();
    await userEvent.click(button('Add Netflix'));
    // nothing left to take focus: the section's first control does
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Filter services' }),
    );
    await waitFor(() =>
      expect(screen.getByText('No service matches')).toBeTruthy(),
    );
  });

  it('a filter that leaves nothing shows `empty`', async () => {
    render(<Grid />);
    narrow([]);
    await waitFor(() =>
      expect(screen.getByText('No service matches')).toBeTruthy(),
    );
  });
});
