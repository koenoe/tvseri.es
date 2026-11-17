// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildDiary } from '@/lib/profile/diary';
import type { DiaryItem } from '@/lib/profile/views';
import DiaryEnd from './DiaryEnd';
import DiaryMonth from './DiaryMonth';

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

const watched = (
  seriesId: number,
  title: string,
  episodeNumber: number,
  iso: string,
): DiaryItem => ({
  episodeNumber,
  runtime: 58,
  seasonNumber: 1,
  seriesId,
  slug: title.toLowerCase().replaceAll(' ', '-'),
  title,
  watchedAt: Date.parse(iso),
});

const BULK = '2024-03-16T20:00:00.000Z';
const [MARCH] = buildDiary([
  watched(1, 'Peaky Blinders', 1, BULK),
  watched(1, 'Peaky Blinders', 2, BULK),
  watched(1, 'Peaky Blinders', 3, BULK),
  watched(2, 'Fleabag', 4, '2024-03-14T21:00:00.000Z'),
]);

describe('DiaryMonth (month header, days, rows)', () => {
  it('a month section named by its header, its days and rows newest first', () => {
    if (!MARCH) {
      throw new Error('no month');
    }
    render(
      <DiaryMonth jump={<button type="button">Jump</button>} month={MARCH} />,
    );
    const section = screen.getByRole('region', { name: 'March 2024' });
    expect(within(section).getByText('4 episodes')).toBeTruthy();
    expect(within(section).getByRole('button', { name: 'Jump' })).toBeTruthy();
    const days = section.querySelectorAll('time');
    expect([...days].map((day) => day.getAttribute('datetime'))).toEqual([
      '2024-03-16',
      '2024-03-14',
    ]);
    expect(within(section).getByText('Marked in one go')).toBeTruthy();
    expect(
      within(section).getByRole('button', {
        name: '3 episodes of Peaky Blinders',
      }),
    ).toBeTruthy();
    expect(
      within(section)
        .getByRole('link', { name: 'Fleabag' })
        .getAttribute('href'),
    ).toBe('/2/fleabag?season=1&episode=4');
  });
});

describe('DiaryEnd: what the end of the list says', () => {
  it('while older months remain, that they load as you scroll', () => {
    render(<DiaryEnd more owner undated={623} />);
    expect(screen.getByText('Older months load as you scroll.')).toBeTruthy();
  });

  it('at the true end, where the undated episodes are', () => {
    const { rerender, container } = render(
      <DiaryEnd more={false} owner undated={623} />,
    );
    expect(container.textContent).toBe(
      '623 episodes marked “I don’t remember” have no date: they count in your totals and sit in each series’ own history.',
    );
    rerender(<DiaryEnd more={false} owner={false} undated={1} />);
    expect(container.textContent).toBe(
      '1 episode marked “I don’t remember” has no date: it counts in the totals and sits in its series’ own history.',
    );
    rerender(<DiaryEnd more={false} owner undated={0} />);
    expect(container.textContent).toBe('');
  });
});
