// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
    expect(screen.queryByRole('link', { name: /^March 2024/ })).toBeNull();
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
