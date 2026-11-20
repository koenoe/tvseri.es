// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AmbiguousItem from './AmbiguousItem';
import FixDone from './FixDone';
import type { Fix } from './fix';
import { AmbiguousProblems } from './KindGroups';
import NotFoundItem, { type NotFoundHandlers } from './NotFoundItem';
import ProblemGroup, { ProblemItemFrame } from './ProblemGroup';
import type { ProblemItem } from './problems';
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
        bodyId="import-group-ambiguous"
        count={13}
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
        bodyId="import-group-ambiguous"
        count={13}
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
    // the number read out; the drawn digits roll beside it (`RollingCount`)
    expect(screen.getByText('13', { selector: '.sr-only' })).toBeTruthy();

    // Shutting plays the shared fold, so the items leave once it has
    rerender(
      <ProblemGroup
        bodyId="import-group-ambiguous"
        count={13}
        name="Two shows with this name"
        onToggle={onToggle}
        open={false}
        what="Pick the right one and its rows come in"
      >
        <p>items</p>
      </ProblemGroup>,
    );
    expect(header.getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(screen.queryByText('items')).toBeNull());
  });

  it('points the header at the items only while they are there', () => {
    const group = (open: boolean) => (
      <ProblemGroup
        bodyId="import-group-ambiguous"
        count={13}
        name="Two shows with this name"
        onToggle={vi.fn()}
        open={open}
        what="Pick the right one and its rows come in"
      >
        <p>items</p>
      </ProblemGroup>
    );
    const { rerender } = render(group(false));
    const header = screen.getByRole('button', {
      name: /Two shows with this name/,
    });
    expect(header.hasAttribute('aria-controls')).toBe(false);

    rerender(group(true));
    const controls = header.getAttribute('aria-controls');
    expect(controls).toBe('import-group-ambiguous');
    expect(document.getElementById('import-group-ambiguous')?.textContent).toBe(
      'items',
    );
  });
});

describe('AmbiguousItem', () => {
  it('offers each series as a chip, and Skip', async () => {
    const onPick = vi.fn();
    const onSkip = vi.fn();
    render(
      <AmbiguousItem
        count="3 rows"
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

  it('gives every series a chip: another name is named, nothing known is the name alone', () => {
    const item: ProblemItem = {
      ...topBoy,
      candidates: [
        {
          id: 1,
          network: 'United Kingdom',
          posterImage: null,
          title: 'Greatest Events of WWII in Colour',
          year: '2019',
        },
        {
          id: 2,
          network: null,
          posterImage: null,
          title: 'Greatest Events of WWII in Colour',
          year: null,
        },
        {
          id: 3,
          network: 'History',
          posterImage: null,
          title: 'WWII in Colour',
          year: '2009',
        },
      ],
      query: 'Greatest Events of WWII in Colour',
      title: 'Greatest Events of WWII in Colour',
    };
    render(
      <AmbiguousItem
        count="2 entries"
        item={item}
        onPick={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    expect(
      screen
        .getAllByRole('button', { pressed: false })
        .map((chip) => chip.textContent),
    ).toEqual([
      '2019 · United Kingdom',
      'Greatest Events of WWII in Colour',
      'WWII in Colour · 2009 · History',
    ]);
  });

  it('shows what was picked, with Undo while it is not sent', async () => {
    const onUndo = vi.fn();
    render(
      <AmbiguousItem
        count="3 rows"
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

describe('a fixed item says so', () => {
  const picked = {
    imported: 3,
    kind: 'picked',
    label: 'Top Boy (2019)',
    rows: 3,
    status: 'waiting',
  } as const;
  const props = {
    count: '3 rows',
    item: topBoy,
    onPick: vi.fn(),
    onSkip: vi.fn(),
    onUndo: vi.fn(),
  };

  // The pick's toast says it ("Imported 3 episodes of Top Boy (2019)"):
  // the item's own region keeps quiet, so it isn't heard twice
  it('leaves a pick or a skip to its toast', () => {
    const { rerender } = render(<AmbiguousItem {...props} />);
    const region = screen.getByRole('status');
    rerender(<AmbiguousItem {...props} fix={picked} />);
    expect(region.textContent).toBe('');
    rerender(
      <AmbiguousItem {...props} fix={{ ...picked, status: 'sending' }} />,
    );
    expect(region.textContent).toBe('');

    rerender(
      <NotFoundItem count="3 rows" handlers={handlers} item={trustNoOne} />,
    );
    rerender(
      <NotFoundItem
        count="3 rows"
        fix={{ kind: 'skipped', rows: 3 }}
        handlers={handlers}
        item={trustNoOne}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('');
  });

  // The failure's toast doesn't say which one: the item's region, there and
  // empty before, names it
  it('names a pick that couldn’t be imported', () => {
    const { rerender } = render(<AmbiguousItem {...props} fix={picked} />);
    const region = screen.getByRole('status');
    rerender(
      <AmbiguousItem {...props} fix={{ ...picked, status: 'failed' }} />,
    );
    expect(screen.getByRole('status')).toBe(region);
    expect(region.textContent).toBe(
      'Top Boy: Couldn’t import as Top Boy (2019)',
    );
  });

  it('has no region for the rest of a group: only a skip, which toasts', () => {
    render(
      <RestItem
        count="153 rows"
        onShow={vi.fn()}
        onSkip={vi.fn()}
        onUndo={vi.fn()}
        skipLabel="Skip all 153"
        skipped={153}
        title="153 more like these"
        why="Recaps and extras"
      />,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });
});

const handlers: NotFoundHandlers = {
  onPickEpisode: vi.fn(),
  onPickShow: vi.fn(),
  onSkip: vi.fn(),
};

const trustNoOne: ProblemItem = {
  ...topBoy,
  candidates: [],
  key: 'nf:trust no one',
  kind: 'series-not-found',
  query: 'Trust No One',
  title: 'Trust No One',
  why: 'Could not find series “Trust No One”',
};

describe('NotFoundItem', () => {
  it('takes focus to the search box once Search manually is pressed', async () => {
    render(
      <NotFoundItem count="3 rows" handlers={handlers} item={trustNoOne} />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Search manually' }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('searchbox', { name: 'Search for the series' }),
    );
  });

  it('keeps Search manually, and its focus, while it lists the episodes', async () => {
    const wednesday: ProblemItem = {
      ...trustNoOne,
      episodes: [{ episodeNumber: 1, seasonNumber: 2, title: 'Woe' }],
      key: 'ep:wednesday',
      kind: 'episode-not-found',
      query: 'Wednesday',
      series: {
        id: 9,
        network: 'Netflix',
        posterImage: null,
        title: 'Wednesday',
        year: '2022',
      },
      title: 'Wednesday',
    };
    render(<NotFoundItem count="1 row" handlers={handlers} item={wednesday} />);
    const search = screen.getByRole('button', { name: 'Search manually' });
    await userEvent.click(search);
    expect(screen.getByText(/which episode was it\?/)).toBeTruthy();
    expect(document.activeElement).toBe(search);
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

/** An item in the import, which keeps what became of it until Undo */
function KeptAmbiguous() {
  const [fix, setFix] = useState<Fix | undefined>();
  const skip = useCallback(() => setFix({ kind: 'skipped', rows: 3 }), []);
  const undo = useCallback(() => setFix(undefined), []);
  return (
    <AmbiguousItem
      count="3 rows"
      fix={fix}
      item={topBoy}
      onPick={vi.fn()}
      onSkip={skip}
      onUndo={undo}
    />
  );
}

function KeptNotFound() {
  const [fix, setFix] = useState<Fix | undefined>();
  const keptHandlers: NotFoundHandlers = {
    ...handlers,
    onSkip: () => setFix({ kind: 'skipped', rows: 3 }),
    onUndo: () => setFix(undefined),
  };
  return (
    <NotFoundItem
      count="3 rows"
      fix={fix}
      handlers={keptHandlers}
      item={trustNoOne}
    />
  );
}

function KeptRest() {
  const [skipped, setSkipped] = useState(0);
  const skip = useCallback(() => setSkipped(153), []);
  const undo = useCallback(() => setSkipped(0), []);
  return (
    <RestItem
      count="153 rows"
      onShow={vi.fn()}
      onSkip={skip}
      onUndo={undo}
      skipLabel="Skip all 153"
      skipped={skipped}
      title="153 more like these"
      why="Recaps and extras"
    />
  );
}

describe('a press that takes its own control away keeps the focus in the item', () => {
  it('Skip hands it to Undo, and Undo to the first series chip', async () => {
    render(<KeptAmbiguous />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Undo' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '2019 · Netflix' }),
    );
  });

  it('for a show that wasn’t found: back to Search manually', async () => {
    render(<KeptNotFound />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Search manually' }),
    );
  });

  it('for the rest of a group: back to Skip all', async () => {
    render(<KeptRest />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip all 153' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Undo' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Skip all 153' }),
    );
  });
});

describe('ProblemItemFrame', () => {
  // a press moves focus to the item's next control: holding Enter mustn't
  // walk on and press that one too (Skip, then Undo, then a pick)
  it('lets a held Enter press only once', () => {
    render(
      <ProblemItemFrame count="2 episodes" title="Dark" why="Two matches">
        <button type="button">Skip</button>
      </ProblemItemFrame>,
    );
    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(fireEvent.keyDown(skip, { key: 'Enter' })).toBe(true);
    // fireEvent returns false once the default was prevented
    expect(fireEvent.keyDown(skip, { key: 'Enter', repeat: true })).toBe(false);
  });
});

const dark: ProblemItem = {
  ...topBoy,
  candidates: [
    {
      id: 3,
      network: 'Netflix',
      posterImage: null,
      title: 'Dark',
      year: '2017',
    },
    { id: 4, network: 'BBC', posterImage: null, title: 'Dark', year: '2005' },
  ],
  key: 'amb:dark',
  query: 'Dark',
  title: 'Dark',
};
const ozark: ProblemItem = {
  ...dark,
  candidates: [
    {
      id: 5,
      network: 'Netflix',
      posterImage: null,
      title: 'Ozark',
      year: '2016',
    },
    { id: 6, network: null, posterImage: null, title: 'Ozark', year: '1999' },
  ],
  key: 'amb:ozark',
  query: 'Ozark',
  title: 'Ozark',
};

const waiting: Fix = {
  imported: 3,
  kind: 'picked',
  label: 'Top Boy (2019)',
  rows: 3,
  status: 'waiting',
};

/** The import's "Which series?", open, keeping what became of each item */
const whichSeries = (
  items: ReadonlyArray<ProblemItem>,
  fixes: Readonly<Record<string, Fix>>,
) => (
  <AmbiguousProblems
    bodyId="import-group-ambiguous"
    count={9}
    fixes={fixes}
    items={items}
    onPick={vi.fn()}
    onSkip={vi.fn()}
    onToggle={vi.fn()}
    onUndo={vi.fn()}
    open
    unit="rows"
  />
);

describe('Undo leaving by itself once the pick is sent', () => {
  it('hands its focus to the next item’s first control', () => {
    const { rerender } = render(
      whichSeries([topBoy, dark], { [topBoy.key]: waiting }),
    );
    screen.getByRole('button', { name: 'Undo' }).focus();
    rerender(
      whichSeries([topBoy, dark], {
        [topBoy.key]: { ...waiting, status: 'sending' },
      }),
    );
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '2017 · Netflix' }),
    );
  });

  it('walks past an item with nothing left to press, to the group’s header', () => {
    const sent: Fix = { ...waiting, status: 'sent' };
    const { rerender } = render(
      whichSeries([topBoy, dark], { [dark.key]: sent, [topBoy.key]: waiting }),
    );
    screen.getByRole('button', { name: 'Undo' }).focus();
    rerender(
      whichSeries([topBoy, dark], {
        [dark.key]: sent,
        [topBoy.key]: { ...waiting, status: 'sending' },
      }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /Which series\?/ }),
    );
  });

  it('leaves focus that was elsewhere alone', () => {
    const { rerender } = render(
      whichSeries([topBoy, dark], { [topBoy.key]: waiting }),
    );
    const outside = screen.getByRole('button', { name: 'Skip' });
    outside.focus();
    rerender(
      whichSeries([topBoy, dark], {
        [topBoy.key]: { ...waiting, status: 'sending' },
      }),
    );
    expect(document.activeElement).toBe(outside);
  });
});

/** Two items, then the rest summed up until Show them */
function CappedGroup() {
  const [expanded, setExpanded] = useState(false);
  const show = useCallback(() => setExpanded(true), []);
  const items = expanded ? [topBoy, dark, ozark] : [topBoy, dark];
  return (
    <AmbiguousProblems
      bodyId="import-group-ambiguous"
      count={9}
      fixes={{}}
      items={items}
      onPick={vi.fn()}
      onSkip={vi.fn()}
      onToggle={vi.fn()}
      onUndo={vi.fn()}
      open
      unit="rows"
    >
      {expanded ? null : (
        <RestItem
          count="3 rows"
          onShow={show}
          onSkip={vi.fn()}
          onUndo={vi.fn()}
          skipLabel="Skip them"
          skipped={0}
          title="3 more rows across 1 series"
          why="More series that share a name"
        />
      )}
    </AmbiguousProblems>
  );
}

describe('Show them', () => {
  it('takes focus to the first item it shows', async () => {
    render(<CappedGroup />);
    await userEvent.click(screen.getByRole('button', { name: 'Show them' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '2016 · Netflix' }),
    );
  });
});
