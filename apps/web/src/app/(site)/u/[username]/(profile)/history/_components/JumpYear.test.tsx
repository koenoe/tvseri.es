// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';
import { monthIndex, type JumpYear as Year } from '@/lib/profile/diary';
import JumpYear from './JumpYear';

// Motion's full features are in (they load after hydration)
vi.mock('@/components/motion/useMaxFeatures', () => ({ default: () => ({}) }));
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

afterEach(cleanup);

const months = Array.from({ length: 12 }, (_, month) => ({
  episodes: month < 3 ? 10 : 0,
  minutes: 0,
}));
const [YEAR] = monthIndex([{ episodes: 30, months, year: 2024 }]) as [Year];

const year = (open: boolean, animate: boolean) => (
  <MotionProvider>
    <ul>
      <JumpYear
        active={null}
        animate={animate}
        basePath="/u/alex/history"
        onPick={vi.fn()}
        onToggle={vi.fn()}
        open={open}
        year={YEAR}
      />
    </ul>
  </MotionProvider>
);

/** The fold the months sit in (the box around their list) */
const fold = () =>
  screen.getByRole('link', { name: /^January 2024/ }).closest('ul')
    ?.parentElement as HTMLElement;

describe('JumpYear', () => {
  it('draws an open year’s months at once on the first paint', () => {
    render(year(true, false));
    expect(fold().className).not.toContain('overflow-hidden');
    expect(fold().style.opacity).not.toBe('0');
  });

  it('folds the months in when the viewer opens the year', async () => {
    const { rerender } = render(year(false, true));
    rerender(year(true, true));
    await vi.waitFor(() =>
      expect(fold().className).toContain('overflow-hidden'),
    );
  });

  it('shows them at once when the scroll opens it before any press', () => {
    const { rerender } = render(year(false, false));
    rerender(year(true, false));
    expect(fold().className).not.toContain('overflow-hidden');
    expect(fold().style.opacity).not.toBe('0');
  });
});
