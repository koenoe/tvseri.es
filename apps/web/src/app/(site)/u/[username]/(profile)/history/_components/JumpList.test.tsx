// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { type JumpYear, monthIndex } from '@/lib/profile/diary';
import JumpList from './JumpList';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: Readonly<{ children: ReactNode; href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const months = (counts: Readonly<Record<number, number>>) =>
  Array.from({ length: 12 }, (_, month) => ({
    episodes: counts[month] ?? 0,
    minutes: 0,
  }));

const INDEX: ReadonlyArray<JumpYear> = monthIndex([
  { episodes: 615, months: months({ 10: 51, 11: 57 }), year: 2025 },
  { episodes: 1104, months: months({ 1: 71, 2: 96, 3: 88 }), year: 2024 },
]);

const BASE = '/u/alex/history';

describe('JumpList (Jump to)', () => {
  it('opens the active month’s year; the active month is current and white', () => {
    render(
      <JumpList active="2024-03" basePath={BASE} index={INDEX} week={null} />,
    );
    const y2024 = screen.getByRole('button', { name: '2024, 1,104 episodes' });
    const y2025 = screen.getByRole('button', { name: '2025, 615 episodes' });
    expect(y2024.getAttribute('aria-expanded')).toBe('true');
    expect(y2025.getAttribute('aria-expanded')).toBe('false');
    const march = screen.getByRole('link', { name: 'March 2024, 96 episodes' });
    expect(march.getAttribute('href')).toBe('/u/alex/history?month=2024-03');
    expect(march.getAttribute('aria-current')).toBe('true');
    const april = screen.getByRole('link', { name: 'April 2024, 88 episodes' });
    expect(april.getAttribute('aria-current')).toBeNull();
    // newest first, months with episodes only
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      ['Apr88', 'Mar96', 'Feb71'],
    );
  });

  it('a year opens and folds; one year open at a time', async () => {
    const user = userEvent.setup();
    render(
      <JumpList active="2024-03" basePath={BASE} index={INDEX} week={null} />,
    );
    await user.click(screen.getByRole('button', { name: /^2025/ }));
    expect(screen.getByRole('link', { name: /^December 2025/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /^March 2024/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /^2025/ }));
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('follows the scroll: a new active month opens its year', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <JumpList active="2025-12" basePath={BASE} index={INDEX} week={null} />,
    );
    await user.click(screen.getByRole('button', { name: /^2024/ }));
    rerender(
      <JumpList active="2025-11" basePath={BASE} index={INDEX} week={null} />,
    );
    const nov = screen.getByRole('link', { name: /^November 2025/ });
    expect(nov.getAttribute('aria-current')).toBe('true');
    // the year it leaves folds shut
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /^March 2024/ })).toBeNull(),
    );
  });

  it('This week leads back to now, for the owner only', () => {
    const { rerender } = render(
      <JumpList
        active={null}
        basePath={BASE}
        index={INDEX}
        week={{ episodes: 1, last: 'Wed 11' }}
      />,
    );
    const week = screen.getByRole('link', { name: /This week/ });
    expect(week.getAttribute('href')).toBe(BASE);
    expect(week.textContent).toContain('1 episode · Wed 11');
    // nothing active: the newest year is open
    expect(
      screen
        .getByRole('button', { name: /^2025/ })
        .getAttribute('aria-expanded'),
    ).toBe('true');

    rerender(
      <JumpList
        active={null}
        basePath={BASE}
        index={INDEX}
        week={{ episodes: 0, last: null }}
      />,
    );
    expect(
      screen.getByRole('link', { name: /This week/ }).textContent,
    ).toContain('No episodes yet');
    rerender(
      <JumpList active={null} basePath={BASE} index={INDEX} week={null} />,
    );
    expect(screen.queryByRole('link', { name: /This week/ })).toBeNull();
  });

  describe('the sidebar folds a long history', () => {
    // 2025 back to 2016, one episode each
    const TEN = monthIndex(
      Array.from({ length: 10 }, (_, index) => ({
        episodes: 1,
        months: months({ 0: 1 }),
        year: 2025 - index,
      })),
    );
    const shownYears = () =>
      screen
        .getAllByRole('button', { name: /^\d{4},/ })
        .map((button) => Number(button.textContent?.slice(0, 4)));

    it('shows the newest five and the year the page opened at; Show all reveals the rest', async () => {
      const user = userEvent.setup();
      render(
        <JumpList
          active="2018-01"
          basePath={BASE}
          fold={{ opened: 2018 }}
          index={TEN}
          week={null}
        />,
      );
      expect(shownYears()).toEqual([2025, 2024, 2023, 2022, 2021, 2018]);
      await user.click(
        screen.getByRole('button', { name: 'Show all 10 years' }),
      );
      expect(shownYears()).toHaveLength(10);
    });

    it('opens the whole list when the scroll reaches a folded year, and stays open', async () => {
      const user = userEvent.setup();
      const list = (active: `${number}-${string}`) => (
        <JumpList
          active={active}
          basePath={BASE}
          fold={{ opened: 2025 }}
          index={TEN}
          week={null}
        />
      );
      const { rerender } = render(list('2021-01'));
      expect(shownYears()).toHaveLength(5);
      rerender(list('2019-01'));
      expect(shownYears()).toHaveLength(10);
      rerender(list('2025-01'));
      expect(shownYears()).toHaveLength(10);
      // only the button folds it again (the revealed years fold shut)
      await user.click(screen.getByRole('button', { name: /Show fewer/ }));
      await waitFor(() => expect(shownYears()).toHaveLength(5));
    });

    it('the phone sheet lists every year', () => {
      render(
        <JumpList active="2025-01" basePath={BASE} index={TEN} week={null} />,
      );
      expect(shownYears()).toHaveLength(10);
      expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
    });
  });

  it('a pick jumps in a transition, without Next’s scroll, and closes the sheet', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <JumpList
        active="2024-03"
        basePath={BASE}
        index={INDEX}
        onPick={onPick}
        week={null}
      />,
    );
    await user.click(screen.getByRole('link', { name: /^February 2024/ }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/u/alex/history?month=2024-02', {
      scroll: false,
    });
  });
});
