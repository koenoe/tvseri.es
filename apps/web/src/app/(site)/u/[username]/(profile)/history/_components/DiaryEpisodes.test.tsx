// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ArmedMaxMotion from '@/components/motion/ArmedMaxMotion';
import type { DiaryRow as Row } from '@/lib/profile/diary';
import DiaryRow from './DiaryRow';

// Motion's full features are in (the month arms them on a press)
vi.mock('@/components/motion/useMaxFeatures', async () => {
  const { domMax } = await import('motion/react');
  return {
    default: () => domMax,
    isMaxLoaded: () => true,
    loadMax: () => Promise.resolve(domMax),
    NOT_YET: () => new Promise<never>(() => {}),
  };
});
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

afterEach(cleanup);

const episode = (number: number) => ({
  code: `S01E0${number}`,
  episode: number,
  key: `1:${number}`,
  runtime: 52,
  season: 1,
  title: `Episode ${number}`,
});

const RUN: Row = {
  bulk: false,
  episodes: [episode(2), episode(3), episode(4)],
  key: '2025-12-03:1',
  poster: null,
  range: 'S01E02–E04',
  runtime: 156,
  season: 1,
  seriesId: 95396,
  show: 'Severance',
  slug: 'severance',
  title: null,
};

/** The fold the episodes sit in: the box around their list, inside the row */
const fold = () => {
  const box = screen.getByRole('list').parentElement as HTMLElement;
  expect(box.hasAttribute('data-diary-row')).toBe(false);
  return box;
};

describe('DiaryEpisodes', () => {
  it('folds a row’s episodes open, and shut again, while the month’s Motion is live', async () => {
    const user = userEvent.setup();
    render(
      <ArmedMaxMotion armed>
        <DiaryRow row={RUN} />
      </ArmedMaxMotion>,
    );
    const toggle = screen.getByRole('button', { name: /^3 episodes/ });

    await user.click(toggle);
    await vi.waitFor(() =>
      expect(fold().className).toContain('overflow-hidden'),
    );

    await user.click(toggle);
    // still drawn while it folds shut, out of reach
    expect(fold().hasAttribute('inert')).toBe(true);
    await vi.waitFor(() => expect(screen.queryByRole('list')).toBeNull(), {
      timeout: 2000,
    });
  });
});
