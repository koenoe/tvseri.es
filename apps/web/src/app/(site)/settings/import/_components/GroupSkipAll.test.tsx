// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCallback, useMemo, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Fix } from '../../_components/problems/fix';
import { openRows } from '../../_components/problems/problemRows';
import type { ProblemItem } from '../../_components/problems/problems';
import type { Importer, SkipRequest } from '../_lib/useImporter';
import AmbiguousGroup from './AmbiguousGroup';
import NotFoundGroup from './NotFoundGroup';

afterEach(cleanup);

type Kind = 'ambiguous' | 'notFound';

const item = (kind: Kind, title: string, rows: number): ProblemItem => ({
  candidates:
    kind === 'ambiguous'
      ? [
          { id: 1, network: 'Netflix', posterImage: null, title, year: '2019' },
          { id: 2, network: 'BBC', posterImage: null, title, year: '2011' },
        ]
      : [],
  episodes: [],
  indexes: Array.from({ length: rows }, (_, index) => index),
  key: `${kind}:${title.toLowerCase()}`,
  kind: kind === 'ambiguous' ? 'ambiguous' : 'series-not-found',
  query: title,
  season: 'Season 1',
  series: null,
  title,
  why: 'Two series have this name.',
});

/** Four items: two shown, the other two summed up until Show them */
const itemsOf = (kind: Kind) => [
  item(kind, 'Top Boy', 3),
  item(kind, 'Dark', 2),
  item(kind, 'Ozark', 4),
  item(kind, 'Lost', 1),
];

/** A group as the import draws it, its skips kept as the importer keeps them */
function Group({
  kind,
  onSkip,
}: Readonly<{ kind: Kind; onSkip: (request: SkipRequest) => void }>) {
  const items = useMemo(() => itemsOf(kind), [kind]);
  const [fixes, setFixes] = useState<Readonly<Record<string, Fix>>>({});
  const [expanded, setExpanded] = useState(false);
  const importer = useMemo(
    () =>
      ({
        clearFix: vi.fn(),
        skip: (request: SkipRequest) => {
          onSkip(request);
          setFixes((was) => {
            const next = { ...was };
            for (const key of request.keys) {
              next[key] = { kind: 'skipped', rows: 1 };
            }
            return next;
          });
        },
        toggleGroup: vi.fn(),
      }) as unknown as Importer,
    [onSkip],
  );
  const showAll = useCallback(() => setExpanded(true), []);
  const skipItem = useCallback(
    (one: ProblemItem) =>
      importer.skip({
        keys: [one.key],
        rows: one.indexes.length,
        toast: `Skipped ${one.title}`,
      }),
    [importer],
  );
  const handlers = useMemo(
    () => ({ onPickEpisode: vi.fn(), onPickShow: vi.fn(), onSkip: skipItem }),
    [skipItem],
  );
  const count = openRows(items, fixes);
  return kind === 'ambiguous' ? (
    <AmbiguousGroup
      count={count}
      expanded={expanded}
      fixes={fixes}
      importer={importer}
      items={items}
      onPick={vi.fn()}
      onShowAll={showAll}
      onSkip={skipItem}
      open
    />
  ) : (
    <NotFoundGroup
      count={count}
      expanded={expanded}
      fixes={fixes}
      handlers={handlers}
      importer={importer}
      items={items}
      onShowAll={showAll}
      open
    />
  );
}

describe.each([
  { header: /^Which series\?/, kind: 'ambiguous', name: 'Which series?' },
  { header: /^Not found/, kind: 'notFound', name: 'Not found' },
] as const)('the import’s $name, shown in full', ({ header, kind, name }) => {
  const SKIP_ALL = { name: `Skip all in ${name}` };

  it('skips every row left in the group with Skip all, after Show them', async () => {
    const onSkip = vi.fn();
    render(<Group kind={kind} onSkip={onSkip} />);
    // the summed-up rest has its own skip
    expect(screen.queryByRole('button', SKIP_ALL)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show them' }));

    await userEvent.click(screen.getByRole('button', SKIP_ALL));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(onSkip.mock.calls[0]?.[0]).toMatchObject({
      keys: itemsOf(kind).map(({ key }) => key),
      rows: 10,
      toast: 'Skipped 10 rows',
    });
    expect(screen.getAllByText('Skipped')).toHaveLength(4);
    // nothing left to skip: the button goes, its focus to the group's header
    expect(screen.queryByRole('button', SKIP_ALL)).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: header }),
    );
  });

  it('leaves the items already fixed out of Skip all', async () => {
    const onSkip = vi.fn();
    render(<Group kind={kind} onSkip={onSkip} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show them' }));
    const [skipTopBoy] = screen.getAllByRole('button', { name: 'Skip' });
    await userEvent.click(skipTopBoy as HTMLElement);
    onSkip.mockClear();
    await userEvent.click(screen.getByRole('button', SKIP_ALL));
    expect(onSkip.mock.calls[0]?.[0]).toMatchObject({
      keys: itemsOf(kind)
        .slice(1)
        .map(({ key }) => key),
      rows: 7,
    });
  });
});
