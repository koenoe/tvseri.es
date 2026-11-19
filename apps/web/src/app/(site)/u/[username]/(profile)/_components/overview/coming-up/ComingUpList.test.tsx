// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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

const renderList = (tickets: number, later: number, noDate: number) =>
  render(
    <MarkingProvider>
      <ComingUpList
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
      foot: 'Show all 9',
      later: 3,
      noDate: 28,
      read: ['T1', 'T2', 'T3', 'T4'],
      state: 'busy: four tickets, Later behind Show all',
      tickets: 6,
    },
    {
      expanded: 'false',
      foot: null,
      later: 3,
      noDate: 28,
      read: ['T1', '| Later |', 'L1', 'L2', 'L3'],
      state: 'quiet: Later fills the rows the tickets leave',
      tickets: 1,
    },
    {
      expanded: 'false',
      foot: 'Show all 5',
      later: 5,
      noDate: 28,
      read: ['L1', 'L2', 'L3', 'L4'],
      state: 'no tickets: Later rows, no divider',
      tickets: 0,
    },
    {
      expanded: 'true',
      foot: 'Show 2 more',
      later: 0,
      noDate: 5,
      read: ['R1', 'R2', 'R3'],
      state: 'nothing dated: No date yet opens itself, three rows',
      tickets: 0,
    },
  ])('$state', ({ expanded, later, noDate, foot, read, tickets }) => {
    renderList(tickets, later, noDate);

    expect(reading()).toEqual(read);
    expect(noDateYet().getAttribute('aria-expanded')).toBe(expanded);
    const feet = screen.queryAllByRole('button', { name: /^Show / });
    expect(feet).toHaveLength(foot ? 1 : 0);
    if (foot) {
      expect(screen.getByRole('button', { name: foot })).toBeTruthy();
    }
    expect(screen.queryByText(/nothing in the next/i)).toBeNull();
  });

  it('No date yet opens ten at a time, then folds back to closed', async () => {
    const user = userEvent.setup();
    renderList(6, 3, 31);
    const waiting = () =>
      reading().filter((name) => name.startsWith('R')).length;

    await user.click(noDateYet());
    expect(noDateYet().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(noDateYet());
    expect(waiting()).toBe(10);

    await user.click(screen.getByRole('button', { name: 'Show 10 more' }));
    expect(waiting()).toBe(20);
    // focus lands on the first row the press revealed
    expect(document.activeElement?.textContent).toBe('R11');

    await user.click(screen.getByRole('button', { name: 'Show 10 more' }));
    await user.click(screen.getByRole('button', { name: 'Show 1 more' }));
    expect(waiting()).toBe(31);
    expect(screen.queryByRole('button', { name: /more$/ })).toBeNull();
    expect(document.activeElement?.textContent).toBe('R31');

    await user.click(noDateYet());
    expect(noDateYet().getAttribute('aria-expanded')).toBe('false');
    expect(waiting()).toBe(0);
    await user.click(noDateYet());
    expect(waiting()).toBe(10);
  });
});
