// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProblemItem } from '../_lib/problems';
import AmbiguousItem from './AmbiguousItem';
import FixDone from './FixDone';
import ProblemGroup from './ProblemGroup';
import RestItem from './RestItem';

const topBoy: ProblemItem = {
  candidates: [
    {
      id: 1,
      network: 'Netflix',
      posterImage: null,
      title: 'Top Boy',
      year: '2019',
    },
    {
      id: 2,
      network: 'Channel 4',
      posterImage: null,
      title: 'Top Boy',
      year: '2011',
    },
  ],
  episodes: [],
  indexes: [4, 5, 6],
  key: 'amb:top boy',
  kind: 'ambiguous',
  query: 'Top Boy',
  season: 'Season 1',
  series: null,
  title: 'Top Boy',
  why: 'Two series have this name.',
};

describe('ProblemGroup', () => {
  it('is a disclosure: the header toggles, the items show only when open', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ProblemGroup
        count={13}
        id="ambiguous"
        name="Two shows with this name"
        onToggle={onToggle}
        open={false}
        what="Pick the right one and its rows come in"
      >
        <p>items</p>
      </ProblemGroup>,
    );
    const header = screen.getByRole('button', {
      name: /Two shows with this name/,
    });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('items')).toBeNull();
    await userEvent.click(header);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(
      <ProblemGroup
        count={13}
        id="ambiguous"
        name="Two shows with this name"
        onToggle={onToggle}
        open
        what="Pick the right one and its rows come in"
      >
        <p>items</p>
      </ProblemGroup>,
    );
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('items')).toBeTruthy();
    expect(screen.getByText('13')).toBeTruthy();
  });
});

describe('AmbiguousItem', () => {
  it('offers each series as a chip, and Skip', async () => {
    const onPick = vi.fn();
    const onSkip = vi.fn();
    render(
      <AmbiguousItem
        fix={undefined}
        item={topBoy}
        onPick={onPick}
        onSkip={onSkip}
        onUndo={vi.fn()}
      />,
    );

    expect(screen.getByText('3 rows')).toBeTruthy();
    expect(screen.getByText('Which one?')).toBeTruthy();
    await userEvent.click(
      screen.getByRole('button', { name: '2011 · Channel 4' }),
    );
    expect(onPick).toHaveBeenCalledWith(topBoy, topBoy.candidates[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledWith(topBoy);
  });

  it('shows what was picked, with Undo while it is not sent', async () => {
    const onUndo = vi.fn();
    render(
      <AmbiguousItem
        fix={{
          imported: 3,
          kind: 'picked',
          label: 'Top Boy (2019)',
          rows: 3,
          status: 'waiting',
        }}
        item={topBoy}
        onPick={vi.fn()}
        onSkip={vi.fn()}
        onUndo={onUndo}
      />,
    );
    expect(screen.getByText('Imported as Top Boy (2019)')).toBeTruthy();
    expect(screen.queryByText('Which one?')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledWith('amb:top boy');
  });
});

describe('FixDone', () => {
  it('drops Undo once a pick has been sent', () => {
    render(
      <FixDone
        fix={{
          imported: 3,
          kind: 'picked',
          label: 'Top Boy (2019)',
          rows: 3,
          status: 'sent',
        }}
        onUndo={vi.fn()}
      />,
    );
    expect(screen.getByText('Imported as Top Boy (2019)')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps Undo on a skip', () => {
    render(<FixDone fix={{ kind: 'skipped', rows: 1 }} onUndo={vi.fn()} />);
    expect(screen.getByText('Skipped')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
  });
});

describe('RestItem', () => {
  it('skips the rest at once, or shows them', async () => {
    const onSkip = vi.fn();
    const onShow = vi.fn();
    render(
      <RestItem
        count="153 rows"
        onShow={onShow}
        onSkip={onSkip}
        onUndo={vi.fn()}
        skipLabel="Skip all 153"
        skipped={0}
        title="153 more like these"
        why="Recaps, extras and titles TMDB doesn’t know, like Cobra Kai and Love, Death & Robots"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Skip all 153' }));
    expect(onSkip).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Show them' }));
    expect(onShow).toHaveBeenCalledOnce();
  });
});
