// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { DiaryRow as Row } from '@/lib/profile/diary';
import DiaryRow from './DiaryRow';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: () => {} }),
}));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: Readonly<{ children: ReactNode; href: string; prefetch?: unknown }>) => (
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

const episode = (season: number, number: number, title: string | null) => ({
  code: `S${String(season).padStart(2, '0')}E${String(number).padStart(2, '0')}`,
  episode: number,
  key: `${season}:${number}`,
  runtime: 52,
  season,
  title,
});

const base: Row = {
  bulk: false,
  episodes: [episode(1, 2, 'Half Loop')],
  key: '2025-12-03:1',
  poster: null,
  range: 'S01E02',
  runtime: 52,
  season: 1,
  seriesId: 95396,
  show: 'Severance',
  slug: 'severance',
  title: 'Half Loop',
};

const run: Row = {
  ...base,
  episodes: [
    episode(1, 2, 'Half Loop'),
    episode(1, 3, 'In Perpetuity'),
    episode(1, 4, 'The You You Are'),
  ],
  range: 'S01E02–E04',
  runtime: 156,
  title: null,
};

describe('DiaryRow (one show on one day)', () => {
  it('one episode: code, title and runtime, the row opens the episode', () => {
    render(<DiaryRow row={base} />);
    const link = screen.getByRole('link', { name: /Severance/ });
    expect(link.getAttribute('href')).toBe(
      '/95396/severance?season=1&episode=2',
    );
    expect(screen.getByText('S01E02')).toBeTruthy();
    expect(screen.getByText('Half Loop')).toBeTruthy();
    expect(screen.getByText('52m')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('several episodes: "3 episodes" opens and folds the list', async () => {
    const user = userEvent.setup();
    render(<DiaryRow row={run} />);
    const toggle = screen.getByRole('button', {
      name: '3 episodes of Severance',
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('S01E02–E04')).toBeTruthy();
    expect(screen.getByText('2h 36m')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();

    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('list');
    expect(toggle.getAttribute('aria-controls')).toBe(list.id);
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/95396/severance?season=1&episode=2',
      '/95396/severance?season=1&episode=3',
      '/95396/severance?season=1&episode=4',
    ]);
    expect(within(list).getByText('The You You Are')).toBeTruthy();

    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('a bulk mark says so', () => {
    render(<DiaryRow row={{ ...run, bulk: true }} />);
    expect(screen.getByText('Marked in one go')).toBeTruthy();
  });
});
