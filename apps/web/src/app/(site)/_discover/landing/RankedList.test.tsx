// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';
import MarkingProvider from '@/lib/marking/MarkingProvider';

import RankedList, { type RankedShow } from './RankedList';

// TileLink prefetches on intent
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: () => {} }),
}));

afterEach(cleanup);

const ITEMS: ReadonlyArray<RankedShow> = Array.from(
  { length: 30 },
  (_, index) => ({
    id: index + 1,
    network: null,
    slug: `show-${index + 1}`,
    title: `Show ${index + 1}`,
    year: 2020,
  }),
);

const renderList = () =>
  render(
    <MotionProvider>
      <MarkingProvider>
        <RankedList
          id="best"
          items={ITEMS}
          subtitle="Highest rated"
          title="The 30 best"
        />
      </MarkingProvider>
    </MotionProvider>,
  );

/** A row's link on desktop (the full row) or on a phone (the compact one) */
const rows = (name: string) =>
  screen.getAllByRole('link', { hidden: true, name: new RegExp(`^${name},?`) });

describe('The ranked list’s pages', () => {
  it('Next slides the next ten in; the ten before leave out of reach', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Next: The 30 best' }));

    const leaving = rows('1. Show 1')[0]?.closest('ol');
    expect(leaving?.getAttribute('aria-hidden')).toBe('true');
    const arriving = rows('11. Show 11')[0]?.closest('ol');
    expect(arriving?.getAttribute('aria-hidden')).toBe(null);
    // the arrows still control the list, whichever page is drawn
    const controls = screen
      .getByRole('button', { name: 'Previous: The 30 best' })
      .getAttribute('aria-controls');
    expect(arriving?.parentElement?.id).toBe(controls);
  });

  it('on a phone, Show more folds the next five in; the first five stay still', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Show 6 to 10 of 30' }));

    const first = rows('1. Show 1').at(-1)?.closest('li');
    expect(first?.style.opacity).toBe('1');
    const added = rows('6. Show 6').at(-1)?.closest('li');
    expect(added?.style.opacity).toBe('0');
  });
});
