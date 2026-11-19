// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';

import ComingUpList from './ComingUpList';

afterEach(cleanup);

const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => (
    <a href={`/${prefix}${index + 1}`} key={index}>
      {`${prefix}${index + 1}`}
    </a>
  ));

const FINISHED = <a href="/u/alex/library/finished">All finished</a>;

const renderList = (tickets: number, later: number, noDate: number) =>
  render(
    <MarkingProvider>
      <ComingUpList
        finished={FINISHED}
        later={rows('L', later)}
        noDate={rows('R', noDate)}
        tickets={rows('T', tickets)}
      />
    </MarkingProvider>,
  );

/** What a reader meets, in order: rows by name, the divider as "| Later |" */
const reading = () =>
  Array.from(
    document.querySelectorAll(
      'a[href^="/T"], a[href^="/L"], a[href^="/R"], [role="separator"]',
    ),
    (node) =>
      node.getAttribute('role') === 'separator'
        ? `| ${node.getAttribute('aria-label')} |`
        : (node.textContent ?? ''),
  );

const noDateYet = () => screen.getByRole('button', { name: /No date yet/ });

describe('Coming up', () => {
  it.each([
    {
      expanded: 'false',
      later: 3,
      noDate: 28,
      read: ['T1', 'T2', 'T3', 'T4'],
      showAll: 'Show all 9',
      state: 'busy: four tickets, Later behind Show all',
      tickets: 6,
    },
    {
      expanded: 'false',
      later: 3,
      noDate: 28,
      read: ['T1', '| Later |', 'L1', 'L2', 'L3'],
      showAll: null,
      state: 'quiet: Later fills the rows the tickets leave',
      tickets: 1,
    },
    {
      expanded: 'false',
      later: 5,
      noDate: 28,
      read: ['L1', 'L2', 'L3', 'L4'],
      showAll: 'Show all 5',
      state: 'no tickets: Later rows, no divider',
      tickets: 0,
    },
    {
      expanded: 'true',
      later: 0,
      noDate: 5,
      read: ['R1', 'R2', 'R3'],
      showAll: 'Show all 5',
      state: 'nothing dated: No date yet opens itself, three rows',
      tickets: 0,
    },
  ])('$state', ({ expanded, later, noDate, read, showAll, tickets }) => {
    renderList(tickets, later, noDate);

    expect(reading()).toEqual(read);
    expect(noDateYet().getAttribute('aria-expanded')).toBe(expanded);
    const feet = screen
      .queryAllByRole('button', { name: /^Show all/ })
      .map((foot) => foot.getAttribute('aria-expanded'));
    expect(feet).toEqual(showAll ? ['false'] : []);
    if (showAll) {
      expect(screen.getByRole('button', { name: showAll })).toBeTruthy();
    }
    // the link to everything finished only beside the opened row
    expect(screen.queryByRole('link', { name: 'All finished' }) !== null).toBe(
      expanded === 'true',
    );
    expect(screen.queryByText(/nothing in the next/i)).toBeNull();
  });

  it('No date yet opens every waiting show, then folds again', async () => {
    const user = userEvent.setup();
    renderList(6, 3, 5);

    await user.click(noDateYet());
    expect(noDateYet().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(noDateYet());
    expect(reading()).toEqual([
      'T1',
      'T2',
      'T3',
      'T4',
      'R1',
      'R2',
      'R3',
      'R4',
      'R5',
    ]);
    const opened = document.getElementById(
      noDateYet().getAttribute('aria-controls') ?? '',
    );
    expect(opened).not.toBeNull();
    // the link is beside the button, never inside it
    expect(within(noDateYet()).queryByRole('link')).toBeNull();
    expect(screen.getByRole('link', { name: 'All finished' })).toBeTruthy();

    await user.click(noDateYet());
    expect(noDateYet().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(noDateYet());
    expect(reading()).toEqual(['T1', 'T2', 'T3', 'T4']);
  });
});
